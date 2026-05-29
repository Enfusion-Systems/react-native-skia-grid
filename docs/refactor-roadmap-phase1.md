# DataGrid.tsx refactor roadmap — Phase 1 (archived 2026-05-26)

**Status:** items #1–6 shipped on `ritesh/UIUX-821_react-native-skia-grid`. Item #7 (`useGridSelector`) was explicitly deferred and carries forward into `refactor-roadmap.md`. Kept here as the historical record of what the first-pass cleanup covered and why — useful for code archaeology / onboarding, not for picking up new work.

---

Living TODO doc for structural cleanup of `src/view/DataGrid.tsx`. Items here came out of a focused analysis against the documented architecture in `ARCHITECTURE.md`, `docs/architectural-overview.md`, and `docs/internals-deep-dive.md`. The intent is that `core/` is pure TS, managers own pipeline state, and `view/` is an orchestration thin layer — several pieces below still violate that.

Each item is independently shippable. Order is suggested-not-required; pick by ROI / blocking dependencies.

Status legend: **TODO** = not started · **IN PROGRESS** = active branch · **DONE** = merged.

---

## 1. Split `GridActionsContext` into 4 scoped contexts — **DONE**

**Problem.** One 27-field context, one 25-dep memo at `DataGrid.tsx:1122-1182`. Invalidates on every selection toggle / filter / sort / row recompute, forcing all 15 consumers to re-render — including layout-only Skia draw layers that read 2-3 static fields.

**Confirmed unneeded re-renders:** `useSectionSeparator` (reads only `{fullHeight, fontManager}`), `useSectionOverlay`, `useHeaderBackground`, `VerticalGroup`, `useHeaderContent`.

**Fix.** Split into `GridLayoutContext`, `GridSelectionContext`, `GridColumnsContext`, `GridActionsContext` along the natural co-usage clusters. Drop `onFilter` (dead surface) and `setRowExpandedState` (unused as context value; still on imperative API).

**Scope.** ~16 internal files. Zero public API change. See the current in-flight plan for cluster-by-cluster field assignment.

---

## 2. Extract `SelectionManager` — **DONE**

**Problem.** Selection state (`nodesSelection: Map<string, 0|1|2>`) lives entirely in React state at `DataGrid.tsx:235-277, 813-845`. ~150 lines of selection logic (toggle, header cascade, leaf propagation, group-state derivation) live in the render body. There is no manager. `architectural-overview.md:389-411` names `SelectionManager` as planned but never built.

**Fix.** Create `src/core/managers/SelectionManager.ts` paralleling `RowManager` / `ColumnManager`:
- Commands: `SelectionCommandTypes.{Toggle, SetAll, Clear, SetByIds}`
- Events: `SelectionEventTypes.SelectionChanged`
- Owns: `Map<string, 0 | 1 | 2>`, header-checkbox derived state
- Subscribes to: `RowsChanged` (to clear selections of removed rows), `GroupChanged` (to clear group-level selections on ungroup)

DataGrid then reads selection via `useSyncExternalStore` against the manager, dispatches via `engine.dispatch(...)`. The `updateRowNodeSelection`, `updateRowSelectionState`, `deselectAll`, and header-checkbox effect (lines 235-277, 345-359, 813-845) collapse to a few engine.dispatch calls.

**Expected LOC reduction in DataGrid.tsx:** ~150 lines.

**Why high-value.** Largest single SRP win in the file. Fully self-contained — no entanglement with existing managers. Unlocks `GridSelectionContext` removal (item #7).

---

## 3. Extract `useGridController` hook — **DONE**

**Problem.** ~180 lines of imperative API method definitions (`applyTransaction`, `setRowsData`, `clearRows`, `getSelectedNodes`, `ensureRowVisible`, `applyColumnState`, etc.) are interleaved with state, effects, and handlers in the render body (`DataGrid.tsx:917-1093`). The `useImperativeHandle` block (1095-1119) just enumerates them.

**Fix.** Move the method definitions into a single hook:

```ts
// src/view/useGridController.ts
export function useGridController<T>(deps: ControllerDeps<T>): SkiaGridAPI<T> {
  const applyTransaction = useRefCallback(...);
  const setRowsData = useRefCallback(...);
  // ... all methods
  return { applyTransaction, setRowsData, /* ... */ };
}
```

DataGrid becomes:
```ts
const controller = useGridController({ engine, rowManager, columnManager, /* ... */ });
React.useImperativeHandle(ref, () => controller);
```

**Why this is safe.** Pure organizational. Zero runtime change. Zero consumer impact. Pattern is canonical — react-hook-form's `useForm`, react-aria's `useListState`, downshift's `useCombobox` all follow it. `useImperativeHandle` is the right *exit point*; this hook is where the API body should *live*.

**Do NOT replace `useImperativeHandle` with an external controller pattern.** `SkiaGridAPI<T>` is publicly exported and 5 mobile consumers use the ref pattern today — switching to an external `<DataGrid controller={...}>` is a breaking change with unclear payoff.

---

## 4. Collapse duplicate React state for `columns` / `sortStatus` / `filterState` — **DONE**

**Problem.** Two sources of truth. ColumnManager already owns columns, sortStatus, filterState — but DataGrid also holds React state copies (`DataGrid.tsx:174, 279, 282-284`) and writes to them before dispatching to the manager (`416-428, 683-688`). React state is the "writing" point; manager state is a copy. Per the docs (`ARCHITECTURE.md`), `core/` should be the single source of truth and React reads via `useSyncExternalStore`.

**Fix.**
- `columns` / `sortStatus` / `filterState` come from ColumnManager via `useSyncExternalStore` against the relevant events (`ColumnsChanged`, `SortChanged`, `FilterChanged`).
- Local `setColumns` / `setSortStatus` / `setFilterStateBase` setters go away.
- `columnsRef.current` (the non-React snapshot used inside callbacks) can stay if needed — it's a perf detail, not a state copy.

**Depends on:** nothing structurally, but easier to land *after* item #5 so the dispatches simplify too.

---

## 5. Move mutation logic into ColumnManager command handlers — **DONE**

**Problem.** The mutation logic for `setColumns` (441-516), `sortColumn` (620-681), and `onGrouped` (518-618) lives in DataGrid as `useRefCallback`s. ~250 lines combined. This is column-state transformation (deriving sort indexes, recomputing group-col widths, injecting `GROUP_COLUMN_ID` / `SelectionCellRenderer`, normalizing pin state) — all of which is ColumnManager's job.

**Fix.** Move the pure-TS portions into ColumnManager command handlers:
- `ColumnCommandTypes.SetColumns` handler absorbs the group-col / selection-col injection + sort-state derivation.
- A new `ColumnCommandTypes.Sort` (or extend `SetSort`) handler absorbs the multi-sort index recalc.
- A new `ColumnCommandTypes.Group` (or extend `SetGroup`) handler absorbs the rowGroupIndex shuffling.

DataGrid's callbacks become one-line `engine.dispatch(...)` calls. Skia/font-specific bits (e.g. `getTextWidth` for the group-col header width at `onGrouped:594`) stay in DataGrid — those don't belong in pure-TS core.

**Side effects to keep out of the manager handlers:** the "clear selection on ungroup" effect in `onGrouped:578-590` is a *consumer* of `GroupChanged`, not part of the mutation. Once `SelectionManager` exists (item #2), that becomes a subscription on the selection manager. Until then, keep it as an effect in DataGrid that listens for `GroupChanged`.

**Depends on:** ideally item #4 first (so React state isn't a parallel writer), but can be done in either order with care.

---

## 6. Extract `useColumnWidthCache` hook — **DONE**

**Problem.** ~80 lines of column-width cache logic (`columnWidthMap`, `resetColumnWidthCache`, `updateColumnWidthCache` at `DataGrid.tsx:184, 195-232, 361-414`) sit inline in the component. It's coherent, has no external dependencies beyond `columns`, `rows`, and `font`, and would benefit from being testable in isolation.

**Fix.** Move into `src/view/useColumnWidthCache.ts`:
```ts
export function useColumnWidthCache(columns, rows, font) {
  const widthMapRef = useRef(new Map());
  const resetColumnWidthCache = useRefCallback(...);
  const updateColumnWidthCache = useRefCallback(...);
  return { widthMapRef, resetColumnWidthCache, updateColumnWidthCache };
}
```

**Why NOT move into ColumnManager.** ColumnManager is part of `core/` which the docs require to be "PURE TYPESCRIPT — Zero React" (`ARCHITECTURE.md`). The cache calls into Skia font measurement (`getFont`, `calculateRowColumnWidths` → `font.measureText`). Dragging Skia into the core layer breaks the layer boundary. Keep the cache in `view/` as a rendering concern.

**Priority.** Cosmetic. Low ROI on its own — fine to ship bundled with the SelectionManager PR (item #2) since both reduce DataGrid line count.

---

## 7. (Eventually) Build `useGridSelector(grid, selector, events)` and drop selection/columns contexts — **DEFERRED → carried forward to Phase 2 #2**

**Problem.** Even with the split (item #1), `GridSelectionContext` and `GridColumnsContext` are middlemen between the managers (the actual source of truth) and the consumers. Each re-render is one indirection more than necessary.

**Goal (per `architectural-overview.md:389-411`).** A selector hook lets consumers subscribe directly to manager events with a custom selector:
```ts
const isSelected = useGridSelector(
  grid,
  (g) => g.selection.get(rowId) === 1,
  [SelectionEventTypes.SelectionChanged]
);
```

Under that model, `GridSelectionContext` and `GridColumnsContext` go away — consumers subscribe directly. `GridLayoutContext` and the slimmed `GridActionsContext` likely stay (they carry callbacks and modal state, not pipeline state).

**Depends on:** items #2 (SelectionManager exists) and #4-5 (managers own columns/sort/filter).

**Why deferred.** Big primitive change. The 4-context split (item #1) delivers most of the re-render benefit at a fraction of the change. Build `useGridSelector` later when the managers are settled and the cost of the indirection is measurable.

---

## Explicitly NOT doing

These came up during analysis and are intentionally off the roadmap:

- **Type-grouping `SkiaGridAPI<T>` into sub-types.** At ~20 methods the flat type isn't a problem. AG Grid runs at 200+ flat methods. Considered and rejected.
- **Replacing `useImperativeHandle` with a non-ref pattern.** Canonical React, matches codebase convention, 5 mobile consumers depend on it.
- **Moving `columnWidthMap` into ColumnManager.** Would drag Skia font measurement into the pure-TS core layer.
- **Moving `topRowNode` out of DataGrid.** Pure view state, no pipeline involvement. Could move to RowManager later if transactional pinned rows are added — not worth doing speculatively.
- **Moving `handleRowPress` / `handleHeaderRowPress` out of DataGrid.** Interaction glue between renderer and selection manager. Will shrink naturally once SelectionManager exists.

---

## Suggested order

1. Item #1 — context split (**in flight**)
2. Item #2 — SelectionManager (biggest LOC win, fully isolated)
3. Item #3 — `useGridController` hook (low risk, makes the rest of the file readable)
4. Items #4 + #5 — collapse duplicate state and move mutations into ColumnManager (do together — they're coupled)
5. Item #6 — `useColumnWidthCache` extraction (bundle with one of the above or ship standalone)
6. Item #7 — `useGridSelector` and context removal (only after managers are settled and the indirection cost is measurable)

Each step is independently mergeable and individually small enough to review.
