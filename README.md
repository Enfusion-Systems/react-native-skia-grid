# react-native-skia-grid

High-performance data grid for React Native, rendered entirely on a [Skia](https://shopify.github.io/react-native-skia/) canvas.

Built for large datasets, 60 fps scrolling, and deep customization — sorting, filtering, grouping, pinning, resizing, selection, and cell editing, all drawn on a single GPU-backed surface instead of thousands of native views.

> **Status:** `0.1.0`, MIT-licensed. The component runs on iOS and Android (both via Skia). The bundled example app and visual-regression suite are currently validated on iOS.

## Contents

- [Why Skia?](#why-skia)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Project setup](#project-setup)
- [Quick start](#quick-start)
- [Column definitions](#column-definitions)
- [Theming](#theming)
- [Density](#density)
- [Imperative API](#imperative-api-ref)
- [Events & callbacks](#events--callbacks)
- [Sorting, filtering & grouping](#sorting-filtering--grouping)
- [Custom cell renderers](#custom-cell-renderers)
- [Slot system](#slot-system)
- [Running the example app](#running-the-example-app)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Contributing](#contributing)
- [License](#license)

## Why Skia?

A traditional RN grid mounts a native view per cell. At a few thousand rows that means tens of thousands of views — slow to mount, expensive to scroll, and heavy on memory. This grid renders the visible window to a Skia `Picture` and scrolls it on the UI thread via Reanimated shared values, so scroll cost stays flat regardless of dataset size, and only the on-screen window is ever recorded.

## Features

- **Skia canvas rendering** — the whole grid is one composable set of drawing layers, not a tree of native views.
- **UI-thread scrolling** — pan is driven by Reanimated shared values; steady-state scroll does no work on the JS thread.
- **Row virtualization** — only the visible window (plus a configurable buffer) is recorded and drawn.
- **Column pinning** — pin columns to the left or right; pinned sections stay put during horizontal scroll.
- **Sorting** — single and multi-column, with pluggable sort value getters and absolute-value sorting.
- **Filtering** — text, number, date, and set filters with AND/OR join operators.
- **Row grouping & aggregation** — group by column with custom aggregation functions.
- **Column resizing** — per-column and per-section resize.
- **Selection** — single or multiple row selection, with checkbox columns.
- **Cell editing** — editable cells with start/stop lifecycle events.
- **Custom cell renderers** — draw anything per column using the exported Skia drawing utilities.
- **Theme system** — 34 cascading design tokens; pass partial overrides or use a preset (`darkTheme`, `lightTheme`).
- **Density** — `high` / `medium` / `low` spacing presets.
- **Slot system** — replace any built-in UI chrome (buttons, inputs, bottom sheet, etc.) with your own components.
- **Imperative API** — a typed ref for programmatic row/column/selection/filter control.

## Requirements

- React Native `>= 0.72` (tested up to `0.79`)
- React `18` or `19`
- A Skia-capable RN setup (New Architecture supported)

## Installation

```bash
yarn add react-native-skia-grid
# or
npm install react-native-skia-grid
```

### Peer dependencies

The grid relies on the surrounding RN graphics/gesture stack. Install these alongside it:

```bash
yarn add \
  @shopify/react-native-skia \
  react-native-reanimated \
  react-native-gesture-handler \
  react-native-svg \
  @gorhom/bottom-sheet \
  @react-navigation/native-stack \
  @fortawesome/react-native-fontawesome \
  @fortawesome/fontawesome-svg-core \
  @fortawesome/free-solid-svg-icons
```

Optional peers (only needed for certain built-in slots / form-based filters): `react-native-safe-area-context`, `react-hook-form`, `@hookform/error-message`, `emoji-regex`.

See [package.json](./package.json) for exact version ranges.

### iOS

```bash
cd ios && pod install
```

### Babel — Reanimated plugin

`react-native-reanimated/plugin` **must be the last plugin** in your Babel config:

```js
// babel.config.js
module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    // ...your other plugins
    "react-native-reanimated/plugin", // keep this last
  ],
};
```

## Project setup

The grid uses gesture handling and a bottom sheet for the column action menu, so wrap your app (once, at the root) in the required providers:

```tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          {/* your screens / the grid */}
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- `GestureHandlerRootView` — **required** at the root for scroll/pan and the bottom sheet.
- `BottomSheetModalProvider` — **required** if you use the built-in column header menu (sort / filter / pin / group).
- `SafeAreaProvider` — recommended; used by some default slots.

The grid provides its own theme, density, and slot context internally — you do **not** need to add a `GridThemeProvider` unless you want to share a theme across multiple grids.

## Quick start

```tsx
import * as React from "react";
import { View } from "react-native";
import { Grid, darkTheme } from "react-native-skia-grid";
import type { SkiaGridAPI, SkiaGridColumn } from "react-native-skia-grid";

type Trade = { id: string; symbol: string; quantity: number; price: number };

const columns: SkiaGridColumn<Trade>[] = [
  { id: "symbol", field: "symbol", name: "Symbol", width: 120, sortable: true, filterType: "set" },
  { id: "quantity", field: "quantity", name: "Qty", width: 90, alignment: "right", sortable: true, filterType: "number" },
  { id: "price", field: "price", name: "Price", width: 100, alignment: "right", sortable: true, filterType: "number" },
];

const rows: Trade[] = [
  { id: "1", symbol: "AAPL", quantity: 100, price: 187.4 },
  { id: "2", symbol: "MSFT", quantity: 250, price: 412.1 },
  { id: "3", symbol: "NVDA", quantity: 75, price: 905.6 },
];

export function MyGrid() {
  const gridRef = React.useRef<SkiaGridAPI<Trade>>(null);

  return (
    // The grid fills its parent — give it a sized container (flex: 1).
    <View style={{ flex: 1 }}>
      <Grid
        ref={gridRef}
        rows={rows}
        columnDefs={columns}
        getRowId={(row) => row.id}
        rowSelection="single"
        theme={darkTheme}
        onSelectionChanged={(nodes) => console.log("selected:", nodes.length)}
      />
    </View>
  );
}
```

Notes:

- Pass your data through the **`rows`** prop. Columns go through **`columnDefs`**.
- Always provide **`getRowId`** so selection, transactions, and grouping stay stable across updates.
- The grid is uncontrolled internally for sort/filter/group state; use the [imperative API](#imperative-api-ref) or callbacks to read/drive it.
- For a strongly-typed grid instance, use `createGridComp<T>()` instead of the generic `Grid`:

  ```tsx
  import { createGridComp } from "react-native-skia-grid";
  const TradeGrid = createGridComp<Trade>();
  ```

## Column definitions

Columns are plain objects of type `SkiaGridColumn<T>` (the `columnDefs` prop accepts `SkiaGridColumnDef<T>[]`, a union of leaf columns and `SkiaColGroupDef<T>` column groups).

Required fields: **`name`** (header label), **`field`** (key into the row), **`width`** (pixels).

```tsx
const column: SkiaGridColumn<Trade> = {
  id: "price",              // stable column id (recommended)
  field: "price",           // key into the row object
  name: "Price",            // header text
  width: 120,               // required, in px

  alignment: "right",       // "left" | "right" | "center"
  sortable: true,
  canResize: true,
  canPinned: true,
  canGrouped: true,
  canFilter: true,
  pinned: "left",           // pin to "left" / "right"
  hide: false,

  filterType: "number",     // "text" | "number" | "date" | "set" | ...
  redIfNegative: true,

  // Derive / format the displayed value:
  valueGetter: (row) => row.price * row.quantity,
  valueFormatter: ({ value }) => `$${Number(value).toFixed(2)}`,

  // Or take full control of the cell's pixels (see Custom cell renderers):
  // cellRenderer: (ctx) => { ... },
};
```

Other useful fields include `sortValueGetter`, `sortByAbsoluteValue`, `checkboxSelection`, `headerCheckboxSelection`, `headerTooltip`, `tooltipValueGetter`, `filterParams`, and `type` (resolved against the `columnTypes` prop). See the exported `SkiaGridColumn` type for the full list.

## Theming

Themes are built from **34 design tokens**, all of which are **optional** — `createTheme` fills in everything you omit via a cascade chain (e.g. `headerBackgroundColor` falls back to `backgroundColor`, `separatorColor` to `borderColor`, and so on).

```tsx
import { createTheme } from "react-native-skia-grid";

const myTheme = createTheme({
  backgroundColor: "#101418",
  cellTextColor: "#e6edf3",
  accentColor: "#3b82f6",
  borderColor: "#222831",
  // everything else is derived automatically
});

<Grid theme={myTheme} rows={rows} columnDefs={columns} getRowId={(r) => r.id} />;
```

Token groups: backgrounds, text colors, accent/interactive, borders & radius, status, sort/filter/group icons, checkbox colors, typography (`fontFamily`, `fontSize`, `headerFontSize`, `headerFontWeight`), spacing (`cellPadding`, `rowHeight`, `headerHeight`), and `direction` (`ltr` / `rtl`).

**Built-in presets:** `darkTheme`, `lightTheme`.

```tsx
import { darkTheme, lightTheme } from "react-native-skia-grid";
```

**Sharing a theme across grids:** wrap them in `GridThemeProvider` instead of passing `theme` to each one.

```tsx
import { GridThemeProvider, darkTheme } from "react-native-skia-grid";

<GridThemeProvider theme={darkTheme}>
  {/* any <Grid> inside picks this up */}
</GridThemeProvider>;
```

## Density

The `density` prop scales fonts and spacing without a custom theme:

```tsx
<Grid density="high" /* "high" | "medium" | "low" */ rows={rows} columnDefs={columns} getRowId={(r) => r.id} />
```

## Imperative API (ref)

Pass a `ref` typed as `SkiaGridAPI<T>` to drive the grid programmatically.

```tsx
const gridRef = useRef<SkiaGridAPI<Trade>>(null);
```

**Rows**

```ts
gridRef.current?.setRowsData(rows);                          // replace all rows
gridRef.current?.applyTransaction({ add: [row], addIndex: 0, update: [], remove: [] });
gridRef.current?.clearRows();
gridRef.current?.getVisibleRows();                           // RowNode<T>[]
gridRef.current?.forEachNode((node) => { /* ... */ });
gridRef.current?.forEachNodeAfterFilter((node) => { /* ... */ });
gridRef.current?.setPinnedTopRow(rowOrNull);
gridRef.current?.ensureRowVisible(rowNode);
gridRef.current?.scrollToRowIndex(99);
gridRef.current?.setRowExpandedState(groupNode, true);       // expand/collapse a group
```

**Columns**

```ts
gridRef.current?.setColumns(columns);                        // replace column defs
gridRef.current?.updateColumn("price", { ...def });
gridRef.current?.getColumnState();                           // SkiaGridColumn<T>[]
gridRef.current?.applyColumnState({ state, applyOrder: true });
gridRef.current?.setSectionWidth({ left: 240 });             // resize a pinned section
```

**Selection**

```ts
gridRef.current?.getSelectedNodes();                         // RowNode<T>[]
gridRef.current?.deselectAll();
gridRef.current?.updateRowSelectionState(rowId, true);
gridRef.current?.setSelectedRow(rowNode);                    // single-selection mode
```

**Filters**

```ts
gridRef.current?.setFilters(filterStateMap);                 // Map<string, ColumnFilterState>
```

> The full surface is the exported `SkiaGridAPI<T>` type. (There is intentionally **no** `exportToCsv`, `on(...)` event subscription, or `register*` extension method — use the props below for events, and the `aggFuncs` / `columnTypes` props for extension.)

## Events & callbacks

Subscribe to grid activity through props (not an event emitter):

| Prop | Fires when |
|---|---|
| `onSelectionChanged(nodes)` | Selection changes |
| `onRowPress(row, column, pressCount)` | A row is tapped |
| `onRowLongPress(row, column)` | A row is long-pressed |
| `onHeaderRowPress(column, pressCount?)` | A header is tapped |
| `onSortChange(columnSort)` | Sort state changes |
| `onFilterChanged(filterState)` | Filters change (`Map<string, ColumnFilterState>`) |
| `onColumnChange()` | Columns change (order/width/visibility) |
| `onColumnRowGroupChanged(columns)` | Row-group columns change |
| `onRowGroupOpened(event)` | A group row is expanded/collapsed |
| `onCellEditingStarted(event)` / `onCellEditingStopped(event)` | Cell edit lifecycle |
| `onRowsUpdated(transaction)` | Rows mutate via a transaction |
| `onGridReady()` | Grid has mounted and is ready |

## Sorting, filtering & grouping

- **Sorting:** set `sortable: true` on a column. Provide `sortValueGetter` for custom orderings or `sortByAbsoluteValue` for magnitude sorts. Multi-column sort is supported (see the `MultiColumnSortStatus` types).
- **Filtering:** set `filterType` (`"text" | "number" | "date" | "set"` and friends) and optional `filterParams`. Read/drive the model via `onFilterChanged` and `setFilters(...)`. The filter UI surfaces through the column header menu (requires `BottomSheetModalProvider`).
- **Grouping:** mark columns `canGrouped: true`, optionally show the built-in grouping control with `showColumnGroupingControl`, and register aggregations through the `aggFuncs` prop:

  ```tsx
  <Grid
    aggFuncs={{ sum: (params) => params.values.reduce((a, b) => a + b, 0) }}
    showColumnGroupingControl
    /* ... */
  />
  ```

## Custom cell renderers

For full control over a cell's pixels, supply a `cellRenderer`. The grid exports the same Skia drawing helpers it uses internally so your renderer stays consistent with the built-in cells:

```ts
import {
  clipCell,
  drawText,
  drawSvgPath,
  getFillPaint,
  getStrokePaint,
  getTextAlign,
  getFont,
  getTextWidth,
} from "react-native-skia-grid";
```

These operate on the grid's `DrawingContext`. Use them to fill backgrounds, draw shaped text via the paragraph cache, render SVG-path icons, and respect cell clipping — without allocating native views.

## Slot system

Every piece of built-in UI chrome can be swapped for your own component via the `slots` prop:

```tsx
<Grid
  slots={{
    BottomSheet: MyBottomSheet,
    Button: MyButton,
    TextInput: MyTextInput,
  }}
  /* ... */
/>
```

Available slots: `Button`, `Text`, `MutedText`, `TextInput`, `Checkbox`, `Pressable`, `TopBar`, `FormContainer`, `BottomSheet`, `ConfirmationDialog`, `Accordion`, `Icon`, `ActionButton`, `FlexView`, `FullView`, `ScrollView`, `Divider`.

## Running the example app

The [`example/`](./example) directory is a Storybook-style showcase with stories for each feature (basic grid, pinning, grouping, filtering, cell editing, imperative API, theming, and a 10k-row enterprise scenario).

```bash
cd example
yarn install
cd ios && pod install && cd ..

# Terminal 1 — Metro
yarn start

# Terminal 2 — build & run
yarn ios     # or: yarn android
```

The example app also hosts the Detox end-to-end suite and the performance/visual-regression harness — see [`example/e2e/`](./example/e2e) and [`benchmarks/`](./benchmarks).

## Performance

The architecture, not micro-optimizations, is what keeps the grid fast:

- **UI-thread scrolling** — pan is a shared-value transform applied on the UI thread; the JS thread does no work during steady-state scroll.
- **Virtualization** — only the visible row window plus a small buffer is recorded into a Skia `Picture`; re-recording happens only when the window refills.
- **Picture & path caching** — recorded pictures and SVG paths are cached and disposed deliberately.
- **Paragraph cache** — shaped text is memoized (very high hit rate in scroll/sort scenarios), so text shaping rarely runs on the hot path.

A repeatable, baseline-tracked benchmark harness lives in [`benchmarks/`](./benchmarks) and runs against the pinned simulator to catch regressions.

## Accessibility

The grid renders to a Skia bitmap canvas, which is not natively exposed to screen readers (VoiceOver / TalkBack). If accessibility is a requirement, pair the grid with an accessibility overlay or provide a native list-based view for screen-reader users.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and our [Code of Conduct](./CODE_OF_CONDUCT.md). Issues and PRs are welcome.

## License

[MIT](./LICENSE)
