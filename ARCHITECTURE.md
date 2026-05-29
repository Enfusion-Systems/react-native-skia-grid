packages/mobile-components/skia-grid/
│
├── src/
│   ├── index.ts                     # Public barrel export
│   │
│   ├── core/                        # PURE TYPESCRIPT — Zero React/Skia/RN
│   │   ├── GridCore.ts              # Orchestrator — owns pipeline, emits events
│   │   ├── ColumnManager.ts         # Column metadata: defs, widths, pinning, order
│   │   ├── RowManager.ts            # Row storage, transactions, structural sharing
│   │   ├── SelectionManager.ts      # Single/multi selection, checkbox state
│   │   ├── EventEmitter.ts          # Typed EventEmitter (~50 lines, no dep)
│   │   ├── pipeline/                # STATELESS pure functions — no classes
│   │   │   ├── filter.ts            # filterRows(rows, model, matchers) → rows
│   │   │   ├── sort.ts              # sortRows(rows, model, comparators) → rows
│   │   │   ├── group.ts             # groupRows(rows, groupCols, aggFuncs) → tree
│   │   │   ├── viewport.ts          # deriveVisibleIndexes(scroll, layout) → range
│   │   │   └── transform.ts         # toRowNodes(data, getRowId) → RowNode[]
│   │   ├── types/                   # ALL types + extension point contracts
│   │   │   ├── column.ts            # GridColumnDef, InternalGridColumn
│   │   │   ├── row.ts               # RowNode, RowDataTransaction, RowDataSource
│   │   │   ├── grid.ts              # GridOptions, GridApi, GridInteractionDelegate
│   │   │   ├── filter.ts            # FilterType, FilterMatcher
│   │   │   ├── sort.ts              # SortModelEntry, SortComparator
│   │   │   ├── cell.ts              # CellRendererParams, CellRenderer
│   │   │   ├── events.ts            # GridEventMap (single map)
│   │   │   ├── theme.ts             # GridThemeTokens
│   │   │   └── aggregation.ts       # AggFunc + built-in sum/avg/count/min/max
│   │   └── utils/                   # LRUCache, memoize, columnUtils
│   │
│   ├── view/                        # VIEW ADAPTER — binds core to component tree
│   │   ├── DataGrid.tsx             # Main public component (forwardRef → GridApi)
│   │   ├── GridProvider.tsx          # Single context: GridCore + API + theme
│   │   ├── hooks/
│   │   │   ├── useGrid.ts           # Creates GridCore, syncs props, returns API
│   │   │   ├── useGridSelector.ts   # useSyncExternalStore + version-based cache bust
│   │   │   ├── useGridApi.ts        # Read API from context
│   │   │   └── useGridTheme.ts      # Read theme from context
│   │   └── slots/types.ts           # Slot prop interfaces for UI chrome
│   │
│   ├── renderer/                    # RENDERING — canvas drawing & interaction
│   │   ├── GridCanvas.tsx           # Canvas + GestureDetector + picture layers
│   │   ├── PictureManager.ts        # SkPicture lifecycle + explicit disposal
│   │   ├── layers/                  # One hook per visual layer
│   │   │   ├── useHeaderBackground  # Header solid fill + column borders
│   │   │   ├── useHeaderContent     # Header text + sort indicators
│   │   │   ├── useCellBackground    # Alternating rows + selection highlight
│   │   │   └── useCellContent       # Cell text + custom renderers
│   │   ├── drawing/                 # Low-level Skia primitives
│   │   │   ├── drawMethods.ts       # drawRect, drawLine, drawTruncatedText, drawCheckbox
│   │   │   ├── fontUtils.ts         # measureTextCached (LRU, 2000 entries)
│   │   │   └── paintFactory.ts      # getFillPaint, getStrokePaint (cached)
│   │   ├── interaction/             # Gesture handling (receives delegate, not GridCore)
│   │   │   ├── GestureController.ts # Compose tap/pan/longPress
│   │   │   └── ScrollPhysics.ts     # Decay, clamping, velocity
│   │   └── cellRenderers/           # Built-in: GroupCellRenderer, SelectionCellRenderer
│   │
│   └── themes/                      # THEMING SYSTEM
│       ├── createTheme.ts           # createTheme(Partial<tokens>) + cascading defaults
│       ├── tokens.ts                # DEFAULT_TOKENS (25+ tokens)
│       └── presets/                  # dark.ts, light.ts
│
└── __tests__/
    ├── core/                        # Unit tests (no React)
    ├── pipeline/                    # Pure function tests
    ├── view/                        # Integration tests
    └── themes/                      # Theme tests
Layer Dependency Graph
┌─────────────────────────────────────────────────────┐
│                   Consumer Code                      │
│         import { DataGrid } from "cwan-skia-grid"    │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │         view/             │
         │  DataGrid, hooks, slots   │
         │  (React 19: useSyncExternalStore, │
         │   useTransition, useImperativeHandle) │
         └──────┬──────────────┬─────┘
                │              │
    ┌───────────┴───┐   ┌─────┴──────────┐
    │    core/      │   │   renderer/    │
    │  GridCore     │   │  GridCanvas    │
    │  Managers     │   │  Layers        │
    │  Pipeline     │   │  Drawing       │
    │  Types        │   │  Interaction   │
    └───────┬───────┘   └───────┬────────┘
            │                   │
            │     ┌─────────────┘
            │     │
       ┌────┴─────┴────┐
       │   themes/     │
       │  createTheme  │
       │  tokens       │
       └───────────────┘
Key rule: renderer/ never imports from core/ directly. Communication flows through GridInteractionDelegate (a callback interface created by the view/ layer).

Core Architecture
GridCore — The Only EventEmitter
GridCore<T> extends TypedEventEmitter<GridEventMap<T>>
  ├── columns: ColumnManager<T>       — plain class, no events
  ├── rows: RowManager<T>             — plain class, no events
  ├── selection: SelectionManager<T>   — plain class, version counter
  ├── _sortModel: SortModelEntry[]     — pipeline state
  ├── _filterModel: Map<...>           — pipeline state
  ├── _filterMatchers: Map<string, FilterMatcher>  — pluggable
  ├── _sortComparators: Map<string, SortComparator> — pluggable
  ├── _aggFuncs: Map<string, AggFunc>  — pluggable
  └── _scheduler: debounced pipeline   — platform-aware timing
Data Pipeline
setRowData(T[]) or applyTransaction(tx)
  → rows.setRaw(data)                        [store raw RowNodes]
  → scheduler.schedule(() => {                [debounced — coalesces rapid mutations]
      filtered = pipeline.filter(raw, filterModel, matchers, columns)
      rows.setExcluded(filtered.excluded)     [Set<string> — structural sharing]
      grouped  = pipeline.group(filtered.rows, groupCols, aggFuncs)
      sorted   = pipeline.sort(grouped, sortModel, comparators)
      rows.setDisplayed(sorted)               [computed output, cached]
      emit('displayedRowsChanged', sorted)    [single emit → view re-renders]
    })
RowManager — Structural Sharing
rawRows: RowNode<T>[]           — single source of truth, mutated in-place
excludedIds: Set<string>        — IDs filtered out (cheap, ~50KB for 5000 rows)
displayed: RowNode<T>[]         — computed output
filtered (getter):              — lazy: raw.filter(id not in excludedIds)
No array copies on transactions. applyTransaction splices in-place with O(k) for k changes.

SelectionManager — In-Place Mutation + Version Counter
toggle(rowId) {
  map.set(rowId, 1) or map.delete(rowId)   // O(1) — same Map instance
  _version++                                 // cache-buster for useGridSelector
}
useGridSelector uses the version counter to detect changes even though the Map reference never changes. This avoids O(n) new Map(old) copies on every selection toggle.

View Layer — React 19 Hooks
useGridSelector (Core Hook)
function useGridSelector<T, R>(
  grid: GridCore<T>,
  selector: (grid: GridCore<T>) => R,
  events: (keyof GridEventMap<T>)[]
): R
Built on useSyncExternalStore. Each event fires → version increments → getSnapshot() returns fresh value → React re-renders only the consumer that subscribed to that event.

Version-based cache busting: When in-place mutations (Map, Array splice) don't change the reference, the internal version counter forces snapshot invalidation.

useTransition for Pipeline Runs
const [, startTransition] = useTransition();

useEffect(() => {
  if (rows) {
    startTransition(() => grid.setRowData(rows));  // non-urgent
  }
}, [rows]);
Pipeline runs (filter/sort/group) are marked as transitions — they don't block gesture interactions.

Slot Pattern
No bundled UI chrome. Consumers provide their own bottom sheets, modals, and controls:

<DataGrid
  slots={{
    ColumnActionsSheet: MyBottomSheet,
    CellEditingSheet: MyEditor,
    ContextMenu: MyContextMenu,
    StatusBar: MyStatusBar,
  }}
/>
7 slot types: ColumnActionsSheet, CellEditingSheet, ColumnChooser, ContextMenu, NoDataOverlay, LoadingOverlay, StatusBar.

Renderer Layer
Picture Layers (6 visual layers)
┌─────────────────────────────────────────────┐
│ Layer 6: Section Overlay (resize handles)   │
│ Layer 5: Header Overlay (sort/filter icons) │
│ Layer 4: Cell Overlay (selection highlight) │
│ Layer 3: Cell Content (text, renderers)     │
│ Layer 2: Cell Background (alternating rows) │
│ Layer 1: Header Background + Content        │
└─────────────────────────────────────────────┘
Each layer is a usePicture() hook returning SkPicture. Redrawn only when viewport row range changes — not per pixel.

GestureController — Delegate Pattern
class GestureController {
  constructor(
    delegate: GridInteractionDelegate,  // NOT GridCore
    scrollState: ScrollState,
    layout: SharedValue<GridLayout>
  )
}
The view layer creates the delegate:

const delegate: GridInteractionDelegate = {
  onCellTap: (row, col, count) => grid.toggleRowSelection(...),
  onHeaderTap: (colId) => grid.sortColumn(colId),
  onColumnResize: (colId, w) => grid.columns.resize(colId, w),
};
Renderer never imports core/. Clean boundary.

Explicit SkPicture Disposal
function updatePicture(sharedValue, newPicture) {
  const old = sharedValue.value;
  sharedValue.value = newPicture;
  if (old) requestAnimationFrame(() => old.dispose());
}
At most 2 pictures per layer at any time (current + disposing).

Theming
Cascading Defaults — Only 2 Tokens Required
const myTheme = createTheme({
  backgroundColor: '#000',
  cellTextColor: '#fff',
});
// All 25+ tokens auto-populated via cascade chain
Cascade rules:

headerTextColor       ← cellTextColor
cellSelectedTextColor ← cellTextColor
headerBackgroundColor ← backgroundColor
separatorColor        ← borderColor
sortIconColor         ← headerTextColor
filterActiveColor     ← sortIconColor
checkboxCheckedColor  ← sortIconColor
...
Composition (AG Grid-inspired)
const custom = darkTheme.withOverrides({
  cellSelectedBackgroundColor: '#0f3460',
  fontFamily: 'Inter',
});
Extension Points
Extension	Registration	Example
Custom filter	api.registerFilterMatcher('currency', matcher)	Currency-aware filtering
Custom sort	api.registerSortComparator('date', comp)	Locale-aware date sorting
Custom aggregation	api.registerAggFunc('weightedAvg', fn)	Weighted average for groups
Custom cell renderer	columnDef.cellRenderer = myRenderer	Status badges, sparklines
Custom cell editor	columnDef.cellEditor = 'myEditor'	Dropdown, date picker
Custom theme	createTheme({ ... })	Brand colors
Custom UI chrome	slots={{ ColumnActionsSheet: MySheet }}	Project-specific bottom sheets
All extensions registered at runtime. Zero source modification.

Performance Budget
Time Complexity
Operation	Target	Approach
Scroll (pan)	O(1)/frame	Shared values only, no JS thread
Viewport derivation	O(1)	Binary search on cumulative widths
Selection toggle	O(1)	Map.set in-place + version bump
Transaction (k adds)	O(k)	splice in-place, no full rebuild
Filter 5000 rows	O(n×f) < 15ms	Single pass per filter, short-circuit
Sort 5000 rows	O(n log n) < 20ms	Native Array.sort
Group 5000 rows	O(n×g) < 25ms	Map bucketing
Space Budget
Structure	5000 rows × 20 cols	Notes
RowNode[] (raw)	~500KB	Wraps user data by reference
excludedIds Set	~200KB worst	Cheaper than array copy
Selection Map	~300KB worst	Single instance, never copied
SkPicture (×3 sections)	~600KB	Disposed before recreating
Font measure LRU	~160KB (2000 cap)	95%+ cache hit after first render
Total	~1.8MB	Target: < 3MB
UI Thread Contract
Worklet	Budget	Total
Shared value updates	< 0.1ms
deriveVisibleIndexes	< 1ms
useDerivedValue (clip/transform)	< 0.5ms
Gesture onChange	< 0.5ms
Per frame	< 2.5ms	Leaves 13.5ms headroom for 60fps
Pipeline Scheduler
Platform-aware debouncing prevents redundant pipeline runs:

SchedulerConfig = {
  pipelineDebounceMs: iOS 50ms | Android 100ms,
  filterDebounceMs: 500ms (per column configurable),
  columnResizeDebounceMs: 16ms (one frame),
}
Multiple rapid mutations (setRowData + setFilterModel in same tick) coalesce into ONE pipeline run.

GridApi (Imperative)
Exposed via ref on <DataGrid>:

const gridRef = useRef<GridApi<MyRow>>(null);

// Row
gridRef.current.setRowData(data)
gridRef.current.applyTransaction({ add: [...], update: [...], remove: [...] })
gridRef.current.getDisplayedRows()
gridRef.current.forEachNode((node, i) => ...)

// Column
gridRef.current.setColumnDefs(defs)
gridRef.current.getColumnState()
gridRef.current.applyColumnState({ state, applyOrder: true })
gridRef.current.autoSizeColumns(['col1', 'col2'])

// Selection
gridRef.current.getSelectedNodes()
gridRef.current.selectAll()
gridRef.current.deselectAll()

// Pipeline
gridRef.current.setFilterModel(model)
gridRef.current.setSortModel(model)
gridRef.current.registerFilterMatcher('custom', matcher)

// Export
gridRef.current.exportToCsv({ fileName: 'data.csv' })

// Theme
gridRef.current.setTheme(lightTheme)

// Events
const unsub = gridRef.current.on('selectionChanged', (nodes) => ...)
Technology Stack
Layer	Technology	Version
Runtime	React Native	0.79.4
UI Framework	React	19.0.0
Rendering	@shopify/react-native-skia	2.0.7
Animation	react-native-reanimated	3.17.4
Gestures	react-native-gesture-handler	2.24.0
Build	react-native-builder-bob	0.23.2
Types	TypeScript (strict)	5.3+
Testing	Jest (react-native preset)	29.7.0
Release	release-it + conventional-changelog	15.0.0
Hooks	lefthook (pre-commit typecheck)	1.5.0
Commits	commitlint (conventional)	9.1.2
Build Outputs
lib/
├── commonjs/    # CJS for Node/Jest
├── module/      # ESM for bundlers
└── typescript/  # .d.ts declarations
Sub-path exports:

cwan-skia-grid — full package
cwan-skia-grid/core — headless core only (no React/Skia)
cwan-skia-grid/themes — theme system only
SOLID Principles
Principle	Application
S — Single Responsibility	GridCore = orchestration. ColumnManager = column metadata. RowManager = row storage. Pipeline functions = stateless transforms.
O — Open/Closed	registerFilterMatcher(), registerSortComparator(), registerAggFunc(), custom CellRenderer, themes via withOverrides(), slots. Zero source modification.
L — Liskov Substitution	Any FilterMatcher replaces another. Any CellRenderer replaces default. RowDataSource can replace rows[].
I — Interface Segregation	GridInteractionDelegate — renderer sees callbacks only. useGridSelector — subscribe to one slice. Slot interfaces expose minimal props.
D — Dependency Inversion	Renderer depends on delegate abstraction. Pipeline functions receive strategies as args. View receives GridCore via context.
Git repository management for enterprise teams powered by Atlassian Bitbucket
Atlassian Bitbucket v8.19.15DocumentationRequest a featureAboutContact Atlassian
Generated by 1294cb6f-950d-476e-9ad7-34c862545cae. Cluster contains one node.
Atlassian