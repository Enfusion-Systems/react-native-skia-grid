# `react-native-skia-grid` — Architectural Overview

> **Read this first.** Everything else is a deeper dive.
> If you're a fresh Claude Code instance starting on this package, this doc is the orientation. After reading it you should know: what the package is, what's in each folder, what the runtime architecture looks like, what conventions matter, and what's pending.

Sibling docs in this folder:
- [`density-plan.md`](density-plan.md) — the next planned migration (modernizing the styling layer with a density-aware token system)
- [`performance-optimizations.md`](performance-optimizations.md) — deep notes on the Skia/canvas/gesture perf tuning that's already landed
- [`utils.ts`](utils.ts) — reference snippet from `web-core` showing the CSS-vars density pattern that the density plan mirrors

A fourth doc — [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — sits at the package root. It's older and partly aspirational (some names and module shapes don't match the current code). Treat it as **target/intent** documentation; this file is **as-is**.

---

## 1. What this package is

A high-performance data grid for **React Native** rendered on a **Skia** canvas. Designed to feel like AG Grid for mobile, with:

- Skia-rendered rows / headers / cells (not native Views per cell — fast scroll on 5000+ rows)
- React DOM/RN chrome for the interactive bits: column actions menu, filter modal, column chooser, cell editing modal, column-grouping pills
- A swappable **slot** system so consumers can replace UI primitives (Button, TextInput, Checkbox, BottomSheet, …)
- A theme system with composable color/canvas tokens

It's a published-or-soon-to-be-published package — public API stability matters.

**Stack:** React Native 0.79, React 19, `@shopify/react-native-skia` v2, `react-native-reanimated` v3, `react-native-gesture-handler` v2, TypeScript strict, `styled-components/native` (legacy — being phased out, see Section 11), `react-native-builder-bob` for build.

**Entry point:** [`src/index.ts`](../src/index.ts) re-exports the public API. The main consumer surface is `<DataGrid<RowType>>` from [`src/view/DataGrid.tsx`](../src/view/DataGrid.tsx).

---

## 2. Folder layout (current, accurate)

```
packages/react-native-skia-grid/
├── src/
│   ├── index.ts                       Public barrel
│   │
│   ├── core/                          PURE TYPESCRIPT — no React, no Skia, no RN
│   │   ├── GridEngine.ts              Facade: dispatches commands to managers, fans out events
│   │   ├── eventBus.ts                Tiny typed EventBus (on/onAny/emit/dispose)
│   │   ├── managers/
│   │   │   ├── RowManager.ts          Owns: rowsData, context, aggFuncs, currentRows (pipeline output), currentFilteredRows. Subscribes to ColumnManager events.
│   │   │   ├── ColumnManager.ts       Owns: columns, filterState, sortStatus, groupedColumns, sectionWidths
│   │   │   └── __tests__/             Jest unit tests (RowManager.test.ts)
│   │   ├── events/                    Typed event payloads
│   │   │   ├── rowEvents.ts           RowsChanged
│   │   │   └── columnEvents.ts        ColumnsChanged, ColumnsResized, FilterChanged, SortChanged, GroupChanged, SectionResized
│   │   ├── pipeline/                  STATELESS pure functions
│   │   │   ├── filter.ts              getFilteredRows(rows, state, columns)
│   │   │   ├── sort.ts                sortRows(rows, columns, sortStatus, level?)
│   │   │   ├── group.ts               groupRows(...)
│   │   │   └── autosize.ts            IoC-based autosize algorithm
│   │   └── types/                     ALL public + internal types live here
│   │       ├── grid.ts                SkiaGridProps, GridApi, …
│   │       ├── column.ts              SkiaGridColumnDef, SkiaInternalGridColumn, …
│   │       ├── row.ts                 RowNode, RowDataTransaction, …
│   │       ├── filter.ts, sort.ts, cell.ts, drawing.ts, icons.ts, primitives.ts, engine.ts (Manager / EngineHost / GridCommand / GridEvent / Unsubscribe)
│   │       └── index.ts               Re-exports
│   │
│   ├── renderer/                      RENDERING — Skia drawing & gestures
│   │   ├── GridCanvas.tsx             Top of the canvas tree; mounts gestures + picture layers
│   │   ├── VerticalGroup.tsx          Composes <Group>/<Picture> for the 8 picture layers
│   │   ├── gridLayers.ts              recordPicture-based factories: createCellContentLayer, createHeaderContentLayer, createNoDataLayer, …
│   │   ├── drawing/                   Low-level Skia primitives: drawMethods, fontUtils, paintFactory
│   │   ├── cellRenderers/             Built-in renderers: GroupCellRenderer, SelectionCellRenderer
│   │   ├── interaction/               Gesture composition (tap/pan/longPress)
│   │   ├── layers/                    Layer-specific hooks (useHeaderTransform, …)
│   │   └── sectionWidthUtils.ts, types.ts
│   │
│   ├── view/                          REACT DOM/RN — public component surface
│   │   ├── DataGrid.tsx               ★ Main public component — `createGridComp<T>()` factory
│   │   ├── CellEditingModal.tsx       Edit modal overlay
│   │   ├── DefaultInputCellEditor.tsx 12-line fallback editor
│   │   ├── ColumnGroupingControl.tsx  Drag-reorder grouped-column pill strip
│   │   └── slots/
│   │       ├── context.ts             SlotsContext + SlotsProvider
│   │       ├── types.ts               GridSlots interface (Button, TextInput, Checkbox, …)
│   │       ├── index.ts               useSlots hook
│   │       └── defaults/              DEFAULT_SLOTS implementations (~16 files)
│   │           ├── DefaultText.tsx, DefaultTextInput.tsx, DefaultButton.tsx, DefaultCheckbox.tsx,
│   │           ├── DefaultPressable.tsx, DefaultTopBar.tsx, DefaultAccordion.tsx,
│   │           ├── DefaultBottomSheet.tsx, DefaultFormContainer.tsx, DefaultLayout.tsx,
│   │           ├── DefaultIcon.tsx, DefaultActionButton.tsx, DefaultConfirmDialog.tsx,
│   │           ├── ErrorBoundary.tsx, filterInputs.tsx (Select / NumericInput / DatePickerInput / ButtonGroupSelect),
│   │           └── commonStyles.ts
│   │
│   ├── columnActions/                 Per-column actions (modal pattern)
│   │   ├── ColumnActionsModal.tsx, HeaderTooltip.tsx, formActionStyles.ts, ColumnUnsortLogo.tsx, context.ts
│   │   ├── autoSize/AutoSizeMenu.tsx
│   │   ├── pin/PinMenu.tsx
│   │   └── filter/                    FilterMenu.tsx, ConditionsList.tsx, SetFilter.tsx
│   │
│   ├── columnChooser/                 Column visibility manager modal
│   │   ├── ColumnChooserModal.tsx, ColumnMenuItems.tsx, styled.tsx, context.ts, types.ts, utils.ts
│   │
│   ├── themes/                        Color/layout theme system
│   │   ├── tokens.ts                  GridThemeTokens (colors, fontFamily/Size, cellPadding, rowHeight, …) + DEFAULT_TOKENS
│   │   ├── createTheme.ts             createTheme(overrides) → frozen GridTheme with .withOverrides()
│   │   ├── GridThemeProvider.tsx      Context + SCThemeProvider + useGridTheme + useDeferredValue for perf
│   │   ├── presets/                   dark.ts, light.ts
│   │   └── __tests__/
│   │
│   ├── internal/                      Cross-cutting utilities (hooks, internal types)
│   │   ├── hooks/                     useRefCallback, useDebounce, useModalState, …
│   │   └── …
│   │
│   ├── utils/                         Pure utility functions (gridUtils, gridLayers helpers, transformDataToRowNode, …)
│   │
│   └── styled-components-native.d.ts  Manual ambient declaration patching styled-components/native typing
│
├── lib/                               Build output (commonjs / module / typescript)
├── package.json                       react-native-builder-bob configuration
└── docs/
    ├── architectural-overview.md      ★ this file
    ├── density-plan.md                next migration (covered separately)
    ├── performance-optimizations.md
    └── utils.ts                       web-core reference for density pattern
```

**Layering rule (enforced by code review, not lint):**

```
view/  ─┬─→ core/        (commands + events + types)
        ├─→ renderer/    (mounts <GridCanvas>)
        ├─→ themes/      (uses GridTheme)
        └─→ slots/       (uses GridSlots, mounts SlotsProvider)

columnActions/, columnChooser/  ─→  view/slots/, themes/, columnActions/context, core/types

renderer/ ─┬─→ core/types  (read-only — no commands/events)
           ├─→ themes/     (color access)
           └─→ utils/

core/  → only itself + type-level imports
```

`renderer/` does not dispatch commands or read engine state directly. It receives data via props from `view/`. Side-effects flow back through callbacks. This keeps `core/` portable (a non-RN host could build a different renderer).

---

## 3. The runtime engine

The package recently migrated to a manager-based architecture. The terms `GridCore` / `useGridSelector` you'll see in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) are the aspirational names — the actual current implementation uses **GridEngine** + **Manager** pattern with **EventBus**.

### `GridEngine` ([core/GridEngine.ts](../src/core/GridEngine.ts))

Thin facade. Holds an EventBus, a list of registered managers, and a batching mechanism. Holds **no grid state** — it's pure routing.

```ts
class GridEngine implements EngineHost {
  register(manager: Manager): void
  dispatch(command: GridCommand): void   // tries each manager.handle() in order
  emit(event: GridEvent): void           // queues during batch, fans out via bus
  on(type: string, listener): Unsubscribe
  batch(fn: () => void): void            // coalesces emits within fn
  dispose(): void
}
```

**Why batch?** `DataGrid` dispatches multiple commands per React commit (e.g. columns + sort + context + aggFuncs). Without coalescing, every dispatch would fire its own `RowsChanged` → `useSyncExternalStore` re-render → 8-layer picture re-record. On a 5000-row grid that stacks to seconds of jank. `engine.batch(...)` queues emits and flushes deduped (one emit per type). The flush is **cascade-aware**: when a flush listener emits more events (e.g. RowManager hearing `ColumnsChanged` and emitting `RowsChanged`), those events queue for the next round instead of firing immediately. Loop terminates when a round produces no new emits.

### `Manager` interface

```ts
interface Manager {
  init?(host: EngineHost): void
  handle(command: GridCommand): boolean   // true = consumed
  dispose?(): void
}
```

### `RowManager<T>` ([core/managers/RowManager.ts](../src/core/managers/RowManager.ts))

**Owns:**
- `rowsData: RowNode<T>[]` — the input array (set via `RowCommandTypes.SetRows`)
- `context: any`, `aggFuncs?` — pipeline-affecting state
- `currentRows: RowNode<T>[]` — pipeline output (filter → group | sort)
- `currentFilteredRows: RowNode<T>[]` — pre-group/sort intermediate, exposed for `forEachNodeAfterFilter`
- `lastInputs` — memoization snapshot of all 7 pipeline inputs

**Mirrors (via subscription, doesn't own):**
- `columns`, `filterState`, `sortStatus`, `groupedColumns` — receives these via `ColumnEventTypes.ColumnsChanged` / `FilterChanged` / `SortChanged` / `GroupChanged` events from ColumnManager.

**Recompute logic:** every command that mutates an input (or every column event) calls `recompute()`. It bails early if every pipeline input is reference-identical to `lastInputs` (the dispatch effect re-fires every sub-dispatch on any change; most carry unchanged refs). Otherwise: `filtered = getFilteredRows(...)`; if `groupedColumns.length` → `groupRows(...)` else `sortRows(...)`. Result becomes `currentRows`. Emits `RowsChanged`.

**Special escape hatch:** `replaceRenderedRows(rows)` for row expand/collapse — synthesizes new output **outside** the pipeline. Doesn't touch `lastInputs`, so subsequent no-op dispatches don't overwrite the expanded array.

### `ColumnManager<T>` ([core/managers/ColumnManager.ts](../src/core/managers/ColumnManager.ts))

**Owns** column definitions and all derived state: widths, pin, visibility, sort status, filter state, group state, section widths.

**Emits granular events** so subscribers can short-circuit:
- `ColumnsChanged` — shape change (added/removed/reordered/pin/visibility)
- `ColumnsResized` — width-only (RowManager ignores → no pipeline recompute)
- `FilterChanged`, `SortChanged`, `GroupChanged` — pipeline-affecting (RowManager listens)
- `SectionResized` — left/center/right section widths (layout-only)

**Commands:** `SetColumns`, `Resize`, `Pin`, `SetVisibility`, `Reorder`, `SetSort`, `SetFilter`, `SetGroup`, `SetSectionWidth`.

### `EventBus<E>` ([core/eventBus.ts](../src/core/eventBus.ts))

~30 lines. `on(type, listener)`, `onAny(listener)`, `emit(event)`, `dispose()`. No magic.

---

## 4. State-ownership contract (the most important section)

This was finalized during Phase 2.4 (Apr-May 2026 sequence of commits prefixed `chore(UIUX-821):`):

| State | Owner | How it gets in |
|---|---|---|
| `rowsData` | RowManager | `engine.dispatch({ type: RowCommandTypes.SetRows, rows })` |
| `context`, `aggFuncs` | RowManager | `RowCommandTypes.SetContext` / `SetAggFuncs` |
| `columns` | ColumnManager | `engine.dispatch({ type: ColumnCommandTypes.SetColumns, columns })` |
| `filterState` | ColumnManager | `ColumnCommandTypes.SetFilter` |
| `sortStatus` | ColumnManager | `ColumnCommandTypes.SetSort` |
| `groupedColumns` | ColumnManager | `ColumnCommandTypes.SetGroup` |
| `sectionWidths` | ColumnManager | `ColumnCommandTypes.SetSectionWidth` |
| pipeline output (`currentRows`, `currentFilteredRows`) | RowManager | computed by `recompute()` |

**RowManager has no `SetColumns`/`SetFilter`/`SetSort`/`SetGroup` command handlers anymore.** Those live on ColumnManager exclusively. RowManager **subscribes** to the column events to keep its mirror cache fresh.

**Why this split:** ColumnManager emits granular events so width-only column changes (a resize drag) skip the row pipeline; pipeline-affecting changes (filter/sort/group) trigger it via subscription. The event bus is the only seam between the two managers.

**Important historical note:** `RowCommandTypes.SetColumns` and `ColumnCommandTypes.SetColumns` both used the literal `"columns:set"` during 2.4d, which caused `engine.dispatch` to route to whichever manager was registered first (RowManager). Phase 2.4e dropped RowManager's handler entirely so the collision is gone — but if you ever re-add a row-side `columns:set` handler, expect routing surprises.

---

## 5. React ↔ engine bridge

### Rows

[`DataGrid.tsx`](../src/view/DataGrid.tsx) instantiates the engine + managers once per mount via `useMemo(() => ..., [])` and reads rows via `useSyncExternalStore`:

```ts
const { engine, rowManager } = React.useMemo(() => {
  const e = new GridEngine();
  const rm = new RowManager<T>();
  const cm = new ColumnManager<T>();
  e.register(rm);
  e.register(cm);
  return { engine: e, rowManager: rm, columnManager: cm };
}, []);

const subscribeRows = React.useCallback(
  (notify) => engine.on(RowEventTypes.RowsChanged, () => notify()),
  [engine]
);
const getRowsSnapshot = React.useCallback(
  () => rowManager.getRows(),
  [rowManager]
);
const rows = React.useSyncExternalStore(subscribeRows, getRowsSnapshot);
```

`rowManager.getRows()` returns a stable reference between recomputes — `useSyncExternalStore` doesn't warn about unstable snapshots.

**Cleanup:** an effect calls `engine.dispose()` on unmount.

### Why no `useState<RowNode<T>[]>` for `rows`?

Pre-Phase 2.3 the rows lived in React state and a subscriber called `setRows` on every emit. That created subtle problems with the combined dispatch effect: `useEffect([engine, rows], ...)` would re-fire after every emit (because rows changed), causing infinite-loop-prone re-dispatch cascades. `useSyncExternalStore` removes rows from the React-state space and reads them lazily via the snapshot.

### Other state

- `columns: SkiaInternalGridColumn<T>[]` — React state in `DataGrid` (set via `setColumns`). On any change a combined effect dispatches the relevant ColumnManager commands, wrapped in `engine.batch(...)` to coalesce.
- `sortStatus`, `filterState`, `selectedColumn`, `nodesSelection`, `topRowNode`, `isColumnResizing` — React state.
- `rowsDataRef`, `columnsRef`, `previousRowsBaseRef`, `columnWidthMap` — refs for non-render side data.

---

## 6. Theme system (current state)

[`themes/tokens.ts`](../src/themes/tokens.ts) defines `GridThemeTokens` (~30 fields):
- Colors: `backgroundColor`, `cellTextColor`, `borderColor`, `accentColor`, …
- Canvas-specific layout: `cellPadding`, `rowHeight`, `headerHeight`, `borderWidth`, `borderRadius`
- Typography: `fontFamily`, `fontSize`, `headerFontSize`, `headerFontWeight`
- Direction: `direction: "ltr" | "rtl"`

[`themes/createTheme.ts`](../src/themes/createTheme.ts) — `createTheme(overrides)` merges defaults, applies cascading rules (e.g. `headerTextColor ??= cellTextColor`), and returns a frozen `GridTheme` with a `withOverrides()` method.

[`themes/GridThemeProvider.tsx`](../src/themes/GridThemeProvider.tsx):
- Holds the GridThemeContext (custom — not styled-components)
- Mounts `<SCThemeProvider theme={deferredTheme}>` inside (so styled-components templates can read `theme`)
- Uses `React.useDeferredValue(theme)` so urgent renders (gestures, taps, input) finish with the previous theme before the 8-layer picture re-record cascade triggers on theme change. See [`performance-optimizations.md`](performance-optimizations.md) for why.

`useGridTheme()` reads from the context and falls back to `darkTheme` (lazy import to avoid circular dep) if no provider is mounted.

**Typing of `theme` in styled-components templates:** [`src/styled-components-native.d.ts`](../src/styled-components-native.d.ts) is a manual augmentation that makes `styled.View<T>\`…\`` accept a generic and types `theme` loosely as `any`. This was added because `styled-components/native` ships with weak generic support. Note this is one of the reasons the package is moving away from styled-components (see Section 11).

---

## 7. Slot system

[`view/slots/types.ts`](../src/view/slots/types.ts) declares the `GridSlots` contract — swappable UI primitives (`Button`, `Text`, `MutedText`, `TextInput`, `Checkbox`, `Pressable`, `TopBar`, `FormContainer`, `BottomSheet`, `ConfirmationDialog`, `Accordion`, `Icon`, `ActionButton`, layout views, `ScrollView`, `Divider`).

[`view/slots/defaults/index.ts`](../src/view/slots/defaults/index.ts) exports `DEFAULT_SLOTS` — the package's reference implementations.

`<DataGrid slots={{ Button: MyButton, ... }}>` — consumers can override any subset. The `useSlots()` hook in modal/menu code reads the merged set.

**Important:** `cellEditor`s are NOT in the slots contract — they're a separate per-column registry: `<DataGrid components={{ myEditor: MyEditor }}>` + `columnDef.cellEditor = "myEditor"`. The fallback is [`view/DefaultInputCellEditor.tsx`](../src/view/DefaultInputCellEditor.tsx).

---

## 8. Renderer (Skia)

8 picture layers composed in [`renderer/VerticalGroup.tsx`](../src/renderer/VerticalGroup.tsx) and the `GridCanvas`:

1. Header background
2. Header content (text + sort indicators + filter icons)
3. Cell background (alternating rows + section overlay + selection)
4. Cell content (text + custom renderers)
5. Cell overlay (selection highlight border)
6. Header overlay (drag indicators)
7. Section overlay (resize handles)
8. NoData overlay (when rows.length === 0 || allColumns.length === 0)

Each layer is built via `recordPicture([clip], [deps], (ctx) => drawXxx(ctx, ...))`. Pictures are stored in `SharedValue<SkPicture>` and updated only when their inputs change. Disposal is explicit and deferred via `requestAnimationFrame` to avoid in-frame teardown.

[`drawing/drawMethods.ts`](../src/renderer/drawing/drawMethods.ts) contains primitive-level draw functions (`drawRect`, `drawLine`, `drawTruncatedText`, `drawCheckbox`, `drawNoData`, …). [`drawing/fontUtils.ts`](../src/renderer/drawing/fontUtils.ts) has `measureTextCached` (LRU 2000 entries, ~95% hit rate after first render). [`drawing/paintFactory.ts`](../src/renderer/drawing/paintFactory.ts) caches paint instances.

Gestures live in [`renderer/interaction/`](../src/renderer/interaction/). They receive a delegate (callbacks supplied by `view/`), not engine references — keeps the renderer decoupled.

For the perf model end-to-end, see [`performance-optimizations.md`](performance-optimizations.md).

---

## 9. Conventions in this codebase

These are the patterns to match when adding code.

**Hooks:**
- `useRefCallback(fn, deps)` over `useCallback` for stable callbacks ([`internal/hooks`](../src/internal/hooks)). It's the project's convention; the React lint rules expect it.
- `useDebounce(fn, ms, deps)` — for input-driven side effects (filter typing).
- `useDeferredValue(theme)` — used in `GridThemeProvider` to keep urgent renders responsive across theme swaps.
- `React.useMemo(() => ..., [])` for one-per-mount objects (engine + managers).

**Refs:**
- `forwardRef` for any swappable component (slots) so consumers can attach refs.
- `useRef<T>` for non-render side data (rowsDataRef, columnsRef, …).

**Styling (current — see Section 11 for direction):**
- `styled-components/native` is used heavily for the React DOM/RN layer. This is **legacy**.
- Skia layers do NOT use styled-components — they use Skia paint API directly.

**State updates:**
- Functional updaters (`setX(prev => ...)`) wherever the new value depends on the old.
- Bail out early in updaters when nothing changed (`if (prev.size === 0 ? prev : new Map())`) to avoid unnecessary re-renders downstream.

**Style merge order in components that take a `style` prop:**
- `style={[internal, props.style]}` — caller's overrides always win.

**Imports:**
- `core/types` is the single source of truth for types. Never declare a public type elsewhere.
- `import type { ... }` for type-only imports.

---

## 10. Public API surface

```ts
// Components
import { DataGrid } from "react-native-skia-grid";

// Theme
import { createTheme, darkTheme, lightTheme, GridThemeProvider, useGridTheme, DEFAULT_TOKENS } from "react-native-skia-grid";
import type { GridTheme, GridThemeTokens } from "react-native-skia-grid";

// Slots
import { DEFAULT_SLOTS, useSlots, SlotsProvider } from "react-native-skia-grid";
import type { GridSlots } from "react-native-skia-grid";

// Types
import type {
  SkiaGridProps, SkiaGridColumnDef, GridApi,
  RowNode, RowDataTransaction, AggFunc,
  ColumnFilterState, MultiColumnSortStatus, …
} from "react-native-skia-grid";

// Subpath exports
import { ... } from "react-native-skia-grid/themes";
```

Imperative API (`gridRef.current.X`): see [`../ARCHITECTURE.md`](../ARCHITECTURE.md) Section "GridApi (Imperative)" for the full list — that part of ARCHITECTURE.md still aligns with current code.

---

## 11. Pending work / known migrations

### Density system + styling-layer modernization

See [`density-plan.md`](density-plan.md) for the full phased plan. Summary:

- Add a `density?: "high" | "medium" | "low"` prop to `<DataGrid>`. Default `"medium"`. Medium is **pixel-identical to current**.
- Introduce a token system (7 primitives + 5-level spacing scale + ~30 derived component tokens) modeled on web-core's [`getCss()`](utils.ts) pattern.
- Density tokens decoupled from theme — separate `<DensityProvider>`, separate `useTokens()` hook.
- Density also drives Skia canvas sizing (rowHeight, headerHeight, cell font) — analogous to web's `--ag-row-height`.
- **Migrate every styled-component in the package to function components with `useMemo(StyleSheet.create)`.** Then drop `styled-components/native` from peerDependencies entirely. Reason: `styled-components/native` is the legacy RN styling pattern; modern RN UI libraries (React Native Paper, Restyle, Tamagui, NativeBase v3+, NativeWind) all use hook + StyleSheet.

This migration is staged across 4 phases (~37 files, ~3-4 days). The plan file has the conversion playbook (Patterns A-D), token specifications, file-by-file rollout, and safety guarantees.

### Smaller pending items

- [`view/slots/defaults/filterInputs.tsx`](../src/view/slots/defaults/filterInputs.tsx) — `ButtonGroupSelect` could forward a `style` prop to its root `View`. Currently destructures it but the existing implementation may have reverted that — verify.
- The filter modal AND/OR button used to have `margin: 16` but was changed to `marginVertical: 8` to align with form rows. See [`columnActions/filter/ConditionsList.tsx:194`](../src/columnActions/filter/ConditionsList.tsx#L194).

### Aspirational pieces in ARCHITECTURE.md not yet built

- `useGridSelector(grid, selector, events)` — the doc describes this as a generic event-aware selector. Current code uses `useSyncExternalStore` directly with explicit subscribe/snapshot callbacks. A wrapper hook may land later.
- `SelectionManager` as a separate manager — selection state currently lives in `DataGrid`'s React state (`nodesSelection: Map<string, 0|1|2>`). Could migrate to a manager later.
- `GridInteractionDelegate` formal interface — exists informally as the prop-callbacks `DataGrid` passes to `GridCanvas`.

---

## 12. Critical files & entry points (cheat sheet)

- [`src/view/DataGrid.tsx`](../src/view/DataGrid.tsx) — main public component, where everything wires together (~1200 lines)
- [`src/core/GridEngine.ts`](../src/core/GridEngine.ts) — engine facade, batch + flush
- [`src/core/managers/RowManager.ts`](../src/core/managers/RowManager.ts) — row pipeline owner
- [`src/core/managers/ColumnManager.ts`](../src/core/managers/ColumnManager.ts) — column state owner
- [`src/core/eventBus.ts`](../src/core/eventBus.ts) — event bus (~30 lines)
- [`src/themes/GridThemeProvider.tsx`](../src/themes/GridThemeProvider.tsx) — theme context + SC bridge + deferred value
- [`src/view/slots/defaults/index.ts`](../src/view/slots/defaults/index.ts) — DEFAULT_SLOTS map + re-exports
- [`src/renderer/GridCanvas.tsx`](../src/renderer/GridCanvas.tsx) — Skia canvas mount point
- [`src/renderer/VerticalGroup.tsx`](../src/renderer/VerticalGroup.tsx) — picture-layer composition
- [`src/styled-components-native.d.ts`](../src/styled-components-native.d.ts) — manual ambient typing for styled-components/native (will be deleted in Phase 4 of density work)
- [`package.json`](../package.json) — bob config, peer deps, jest config

**Tests:** [`src/core/managers/__tests__/RowManager.test.ts`](../src/core/managers/__tests__/RowManager.test.ts) is the reference unit-test setup for managers (mock host with closure-backed listener Set).

**Stress harness:** [`apps/mobile/components/BaseGrid.tsx`](../../../apps/mobile/components/BaseGrid.tsx) renders 5000 rows for perf smoke testing during development.

---

## 13. Recent migration history (Phase 2.x — Apr-May 2026)

For context if you're reading commits prefixed `chore(UIUX-821):` in the log.

| Phase | What landed |
|---|---|
| 2.1 | Internal cleanup — `internal/` reorganized; cross-cutting hooks kept; aspirational scaffolding removed |
| 2.2 | Dissolved `src/types/` — moved public types into `core/types/`, layer-specific types into `renderer/types.ts` |
| 2.3 | Introduced GridEngine + RowManager + EventBus. Routed row pipeline through the manager. `DataGrid` switched from `useState<rows>` to `useSyncExternalStore`. Dropped the inline `getRowsInternal` helper. |
| 2.4a | Scaffolded `ColumnManager` + `columnEvents` + autosize pipeline function (no consumers yet) |
| 2.4b | Migrated `sortStatus` ownership to ColumnManager (`SetSort` dispatch routed through ColumnManager → emits `SortChanged` → RowManager subscriber updates + recomputes). Required adding cascade-aware flush to GridEngine. |
| 2.4c | Migrated `filterState` ownership |
| 2.4d | Migrated `columns` + `groupedColumns` ownership. Resolved a `"columns:set"` literal collision between RowManager and ColumnManager (both used the same string) by completing 2.4e in the same change. |
| 2.4e | Removed RowManager's now-dead `SetColumns` / `SetFilter` / `SetSort` / `SetGroup` command handlers and union members. Updated RowManager unit tests to drive column-side state via `host.emit(ColumnsChanged / FilterChanged / SortChanged)` instead of dispatching column commands. |

The `withOverrides` helper on `GridTheme` and `GridThemeProvider`'s `useDeferredValue` are older. The 8-layer picture cascade and chunked column-width cache rebuild are documented in [`performance-optimizations.md`](performance-optimizations.md).

---

## 14. Things to be careful about

- **Don't add new types outside `core/types/`.** Single source of truth.
- **Don't add a row-side command handler for column state** (`SetColumns`, `SetFilter`, `SetSort`, `SetGroup`). Those now live on ColumnManager exclusively. Adding them back creates a routing collision.
- **Don't touch `lastInputs` from outside `recompute()`** unless you're setting it to `null` (the `Recompute` command does this to force a re-run).
- **Don't dispatch outside `engine.batch(...)` when issuing 2+ related commands.** It's not just a perf optim — without batching, intermediate `RowsChanged` emits make consumers race.
- **Don't read `rowManager.getRows()` synchronously inside the dispatch you just issued unless that dispatch handler is synchronous.** It is for `SetRows` / `SetContext` / `SetAggFuncs` / `Recompute`. For column events it's NOT — those go through the engine's batch flush, so the recompute happens after the dispatch returns.
- **Refactors that touch styled-components**: every styled-component in the package will be rewritten as a function component during the density migration. If you're adding new code, prefer `useTokens()` + `useGridTheme()` + `useMemo(StyleSheet.create)` over `styled.View\`…\`` so you don't add work to the migration. (Once the migration completes, this becomes "do not use styled-components at all".)
- **The Skia canvas is independent of the React DOM theming work.** Density affects canvas sizing via separate `canvasRowHeight` / `canvasHeaderHeight` / `canvasFontSize` tokens (Phase 3 of the density plan). Don't try to push styled-components-style theming into Skia paint code.

---

That's the lay of the land. Density work continues in [`density-plan.md`](density-plan.md).
