import * as React from "react";
import type { SkiaGridAPI } from "react-native-skia-grid";

import { DataSizeControls } from "../components/DataSizeControls";
import { StoryScaffold } from "../components/StoryScaffold";
import { basicColumns, buildColumns, makeRows, type Row } from "../seededData";
import { Grid } from "./_grid";

// Boundary datasets: 0 rows (shows noDataText), 1 row, 100 rows. Starts empty.
const BASE = basicColumns();

export function EmptyAndEdgeStory(): React.ReactElement {
  const gridRef = React.useRef<SkiaGridAPI<Row> | null>(null);
  const [rowCount, setRowCount] = React.useState(0);
  const rows = React.useMemo(() => makeRows(rowCount), [rowCount]);

  return (
    <StoryScaffold
      title="Empty & edge cases"
      description="0 rows (noDataText) · 1 row · 100 rows — boundary datasets."
      instructions={[
        "Starts at 0 rows — the noDataText placeholder is shown.",
        "Use the Rows 0 / 1 / 100 presets to switch dataset size.",
        "Confirms the grid handles empty and single-row data cleanly.",
      ]}
      controls={
        <DataSizeControls
          initialRows={0}
          initialCols={BASE.length}
          onRows={setRowCount}
          onCols={(n) => gridRef.current?.setColumns(buildColumns(BASE, n))}
          rowPresets={[0, 1, 100]}
        />
      }
    >
      {(reportState) => (
        <Grid
          ref={gridRef}
          rows={rows}
          columnDefs={BASE}
          getRowId={(r) => r.id}
          noDataText="No data to display"
          onLayoutComplete={reportState}
        />
      )}
    </StoryScaffold>
  );
}
