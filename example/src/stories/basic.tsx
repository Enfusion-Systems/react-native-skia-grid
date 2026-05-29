import * as React from "react";
import type { SkiaGridAPI } from "react-native-skia-grid";

import { DataSizeControls } from "../components/DataSizeControls";
import { StoryScaffold } from "../components/StoryScaffold";
import { basicColumns, buildColumns, makeRows, type Row } from "../seededData";
import { Grid } from "./_grid";

// The canonical 5-column grid. Also the target of smoke.spec.ts, so it must
// mount with exactly basicColumns() (symbol/quantity/price/side/status) and 100
// rows before any control is touched.
const BASE = basicColumns();

export function BasicStory(): React.ReactElement {
  const gridRef = React.useRef<SkiaGridAPI<Row> | null>(null);

  // Rows are CONTROLLED — the grid reacts to `rows` prop changes, so the row
  // count control just updates state.
  const [rowCount, setRowCount] = React.useState(100);
  const rows = React.useMemo(() => makeRows(rowCount), [rowCount]);

  return (
    <StoryScaffold
      title="Basic grid"
      description="100 deterministic rows × 5 columns, single-row selection."
      instructions={[
        "Tap a column header → action sheet (Sort / Filter / Pin / Auto size / Group).",
        "Tap a row to select it (rowSelection=\"single\").",
        "Use the Rows / Cols controls to resize the dataset at run-time.",
      ]}
      controls={
        <DataSizeControls
          initialRows={100}
          initialCols={BASE.length}
          onRows={setRowCount}
          // Columns can only be replaced imperatively (the grid bootstraps
          // `columnDefs` once at mount); buildColumns extends/trims the base set.
          onCols={(n) => gridRef.current?.setColumns(buildColumns(BASE, n))}
        />
      }
    >
      {(reportState) => (
        <Grid
          ref={gridRef}
          rows={rows}
          columnDefs={BASE}
          getRowId={(r) => r.id}
          rowSelection="single"
          showColumnGroupingControl
          onLayoutComplete={reportState}
        />
      )}
    </StoryScaffold>
  );
}
