# DataGrid.tsx refactor roadmap — Phase 2

Picks up after [`refactor-roadmap-phase1.md`](./refactor-roadmap-phase1.md) (items #1–6 of the Phase 1 list have shipped on `ritesh/UIUX-821_react-native-skia-grid`).

This phase focuses on the rough edges left behind: a couple of state round-trips that the manager extraction exposed, plus the long-deferred selector primitive that would let us drop the view-layer context indirection. Items are independently shippable. Order is suggested-not-required.

Status legend: **TODO** = not started · **IN PROGRESS** = active branch · **DONE** = merged.

---

## 1. Untangle the `filterState` write path — **TODO**

**Problem.** `filterState` is written twice for every filter change, and each write triggers a full `RowManager.recompute()`.

The current flow:

1. UI calls `setFilterState(x)` ([`DataGrid.tsx:329-344`](../src/view/DataGrid.tsx#L329-L344)) — immediately dispatches `SetFilter` → ColumnManager assigns + emits `FilterChanged` → RowManager listener calls `recompute()` ([`RowManager.ts:117-120`](../src/core/managers/RowManager.ts#L117-L120)).
2. `useEngineStore` re-reads the new `filterState`.
3. The `useDebounce` at [`DataGrid.tsx:497-511`](../src/view/DataGrid.tsx#L497-L511) sees `filterState` change as a dep and, after the debounce window, dispatches `SetFilter` **again** with the same value. ColumnManager has no equality guard ([`ColumnManager.ts:266-269`](../src/core/managers/ColumnManager.ts#L266-L269)), so it re-assigns and re-emits → another full RowManager recompute.

The `useDebounce` exists for one legitimate side-effect: resetting the column-width cache *after* the new filtered row set lands. The re-dispatch is dead weight.

**Fix.** Choose one of:

- **(a) Drop the re-dispatch.** Change the debounced effect body to just `resetColumnWidthCache(rowManager.getRows())`. The immediate dispatch in `setFilterState` already wrote the value; the debounce only needs to react to it settling.
- **(b) Move debouncing into `setFilterState` itself.** Drop the immediate dispatch, debounce the write, and have the same callback fire the cache reset after. Removes the round-trip *and* the dual-write pattern. Riskier — every caller of `setFilterState` now sees a delayed write.

(a) is the safer fix. (b) is the cleaner one if we're willing to audit callers.

**Add an equality guard to `ColumnManager.SetFilter` as a belt-and-suspenders measure.** Map identity comparison would prevent any future caller from accidentally re-dispatching the same value and paying for a recompute. Same arguably applies to `SetSort` and `SetColumns`.

**Why it matters.** Each filter keystroke (post-debounce) currently triggers 2× the pipeline work. On large grids this is visible.

---

## 2. Build `useGridSelector` and drop `GridSelectionContext` / `GridColumnsContext` — **TODO, DEFERRED** (carryover from Phase 1 #7)

**Problem.** Even with the 4-context split, `GridSelectionContext` and `GridColumnsContext` are middlemen between the managers (the actual source of truth) and the consumers. Each re-render is one indirection more than necessary, and the context values still invalidate on every selection toggle / column change — re-rendering all consumers even when their selector output didn't change.

**Goal (per [`architectural-overview.md:389-411`](./architectural-overview.md)).** A selector hook lets consumers subscribe directly to manager events with a custom selector, returning a memoized slice:

```ts
const isSelected = useGridSelector(
  grid,
  (g) => g.selection.get(rowId) === 1,
  [SelectionEventTypes.SelectionChanged]
);
```

Under that model, `GridSelectionContext` and `GridColumnsContext` go away — consumers subscribe directly to the engine. `GridLayoutContext` and the slimmed `GridActionsContext` stay (they carry callbacks and modal state, not pipeline state).

**Why it stays deferred.** Big primitive change. The 4-context split shipped in Phase 1 captured most of the re-render benefit at a fraction of the change cost. Worth building `useGridSelector` once we have a measurable consumer that's actually hurting from the indirection, or when a new feature would benefit from the per-row subscription pattern (e.g. virtualized cell-level subscriptions).

**Depends on:** nothing structurally — Phase 1 unblocked it. Gated on demand, not on prerequisites.

---

## 3. Move column normalization out of `setColumns` — **TODO, LOW PRIORITY**

**Problem.** [`setColumns` at `DataGrid.tsx:361-418`](../src/view/DataGrid.tsx#L361-L418) is still ~55 lines of column-array transformation in the view layer: injecting the `GROUP_COLUMN_ID` row-group column, injecting the `SelectionCellRenderer` for checkbox-selection columns, normalizing pin / sort / resize flags on the injected cols. The actual command dispatch is the last 3 lines.

The reason this stayed in the view layer during Phase 1 #5 is that both injected columns reference React component renderers (`GroupCellRenderer`, `SelectionCellRenderer`) which can't live in pure-TS `core/`.

**Fix.** Two paths:

- **(a) Cell-renderer registry.** Have ColumnManager inject `__id`-only stubs (`{__id: GROUP_COLUMN_ID, cellRendererKey: "group"}`); the renderer layer resolves the key → component at draw time. Then `SetColumns` handler in ColumnManager owns the injection logic, and `setColumns` in DataGrid collapses to a one-line dispatch.
- **(b) Leave it.** It's not actually hurting anything. The logic is coherent and read-once.

Lean toward (a) only if another feature needs renderer indirection (e.g. user-provided custom group renderers, slot system extension). Otherwise (b) — the cost of the layering hack isn't worth the complexity of a key→component registry.

---

## 4. Use `useEngineStore` for any future engine-backed view state — **CONVENTION**

Not a refactor item — just a note that the [`useEngineStore`](../src/view/useEngineStore.ts) primitive extracted in this branch is the canonical way to bridge manager state into React. Any new manager-backed read in `view/` should go through it. Avoid hand-rolling `subscribe`/`getSnapshot`/`useSyncExternalStore` triples.

---

## Explicitly NOT doing

Carries forward from Phase 1, still valid:

- **Type-grouping `SkiaGridAPI<T>` into sub-types.** Flat API of ~20 methods is fine; AG Grid runs at 200+. Considered and rejected.
- **Replacing `useImperativeHandle` with a non-ref controller pattern.** Canonical React, matches codebase convention, multiple mobile consumers depend on it.
- **Moving `columnWidthMap` into ColumnManager.** Would drag Skia font measurement into the pure-TS core layer. Stays in [`useColumnWidthCache`](../src/view/useColumnWidthCache.ts).
- **Moving `topRowNode` out of DataGrid.** Pure view state, no pipeline involvement. Could move to RowManager if transactional pinned rows are added — not worth speculating on.

---

## Suggested order

1. Item #1 — `filterState` cleanup (small, isolated, measurable perf win)
2. Item #2 — `useGridSelector` (only when a consumer demands it)
3. Item #3 — leave unless a feature forces it
