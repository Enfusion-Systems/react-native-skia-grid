# react-native-skia-grid

High-performance data grid for React Native, rendered with [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/).

Built for large datasets, 60fps scrolling, and full customization.

## Features

- **Skia canvas rendering** with 6 composable visual layers
- **60fps scrolling** via Reanimated SharedValues (zero JS thread during scroll)
- **Column pinning** (left/right), **sorting**, **filtering**, **grouping**, and **resizing**
- **Row selection** (single/multi) with checkbox support
- **Cell editing** with custom editors
- **Custom cell renderers** for any column
- **Filter system**: text, number, date, set filters with AND/OR operators
- **Multi-column sorting** with pluggable comparators
- **Row grouping** with custom aggregation functions
- **CSV export**
- **Theme system** with cascading token defaults
- **Slot system** for replacing built-in UI components
- **Imperative API** via ref for programmatic control
- **Extension points**: custom filters, sort comparators, aggregations

## Installation

```bash
yarn add react-native-skia-grid
```

### Peer Dependencies

```bash
yarn add @shopify/react-native-skia react-native-reanimated react-native-gesture-handler
```

See [package.json](./package.json) for the full list of peer dependencies.

## Quick Start

```tsx
import { Grid, createTheme, darkTheme } from "react-native-skia-grid";
import type { SkiaGridAPI, SkiaGridColumnDef } from "react-native-skia-grid";

type Row = { id: number; name: string; value: number };

const columns: SkiaGridColumnDef<Row>[] = [
  { id: "name", field: "name", headerName: "Name", sortable: true },
  { id: "value", field: "value", headerName: "Value", sortable: true },
];

const data: Row[] = [
  { id: 1, name: "Alpha", value: 100 },
  { id: 2, name: "Beta", value: 200 },
];

function MyGrid() {
  const gridRef = React.useRef<SkiaGridAPI<Row>>(null);

  return (
    <Grid
      ref={gridRef}
      columnDefs={columns}
      rowData={data}
      theme={darkTheme}
    />
  );
}
```

## Theming

Create custom themes with cascading defaults. Only 2 tokens are required:

```tsx
import { createTheme } from "react-native-skia-grid";

const myTheme = createTheme({
  backgroundColor: "#1a1a2e",
  cellTextColor: "#e0e0e0",
});
// All 25+ tokens auto-populated via cascade chain
```

Built-in presets: `darkTheme`, `lightTheme`.

## Slot System

Replace any built-in UI component with your own:

```tsx
<Grid
  slots={{
    BottomSheet: MyCustomBottomSheet,
    Button: MyCustomButton,
    TextInput: MyCustomInput,
  }}
  // ...
/>
```

Available slots: `Button`, `Text`, `MutedText`, `TextInput`, `Checkbox`, `Pressable`, `TopBar`, `FormContainer`, `BottomSheet`, `ConfirmationDialog`, `Accordion`, `Icon`, `ActionButton`, `FlexView`, `FullView`, `ScrollView`, `Divider`.

## Grid API

Access the imperative API via ref:

```tsx
const gridRef = useRef<SkiaGridAPI<Row>>(null);

// Row operations
gridRef.current.setRowData(data);
gridRef.current.applyTransaction({ add: [...], update: [...], remove: [...] });
gridRef.current.getDisplayedRows();

// Column operations
gridRef.current.setColumnDefs(defs);
gridRef.current.getColumnState();
gridRef.current.applyColumnState({ state, applyOrder: true });
gridRef.current.autoSizeColumns(["col1", "col2"]);

// Selection
gridRef.current.getSelectedNodes();
gridRef.current.selectAll();
gridRef.current.deselectAll();

// Pipeline
gridRef.current.setFilterModel(model);
gridRef.current.setSortModel(model);

// Extension points
gridRef.current.registerFilterMatcher("currency", matcher);
gridRef.current.registerSortComparator("date", comparator);
gridRef.current.registerAggFunc("weightedAvg", fn);

// Export
gridRef.current.exportToCsv({ fileName: "data.csv" });

// Events
const unsub = gridRef.current.on("selectionChanged", (nodes) => { ... });
```

## Performance

| Operation | Target | Approach |
|---|---|---|
| Scroll (pan) | O(1)/frame | SharedValues only, no JS thread |
| Selection toggle | O(1) | Map.set in-place + version bump |
| Transaction (k adds) | O(k) | splice in-place, no full rebuild |
| Filter 5000 rows | < 15ms | Single pass per filter |
| Sort 5000 rows | < 20ms | Native Array.sort |
| Memory (5000x20 grid) | ~1.8MB | Picture disposal + LRU cache |

## Accessibility

This grid renders to a Skia bitmap canvas, which is not natively accessible to screen readers (VoiceOver/TalkBack). If accessibility is a requirement for your use case, consider pairing the grid with an accessibility overlay or using a native list-based approach for screen-reader users.

## License

MIT
