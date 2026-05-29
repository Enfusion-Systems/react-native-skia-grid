import * as React from "react";
import type { SkiaGridAPI } from "react-native-skia-grid";

import { DataSizeControls } from "../components/DataSizeControls";
import { StoryScaffold } from "../components/StoryScaffold";
import {
  buildColumns,
  demoAggFuncs,
  enterpriseColumns,
  makeRows,
  type Row,
} from "../seededData";
import { Grid } from "./_grid";

// Large, mixed-config dataset: symbol pinned left, status pinned right, every
// column sortable/filterable/groupable, multi-select. Starts at 1k for fast
// mount; push to 10k with the Rows control to exercise virtualization.
const BASE = enterpriseColumns();

export function EnterpriseStory(): React.ReactElement {
  const gridRef = React.useRef<SkiaGridAPI<Row> | null>(null);
  const [rowCount, setRowCount] = React.useState(1000);
  const rows = React.useMemo(() => makeRows(rowCount), [rowCount]);

  return (
    <StoryScaffold
      title="Enterprise (large data)"
      description="1k–10k rows, pinned columns, filter + sort + group, multi-select."
      instructions={[
        "Symbol is pinned left, Status pinned right — scroll horizontally.",
        "Bump Rows to 10k and scroll — rendering stays virtualized.",
        "Cols control adds extra numeric columns at run-time.",
      ]}
      controls={
        <DataSizeControls
          initialRows={1000}
          initialCols={BASE.length}
          onRows={setRowCount}
          onCols={(n) => gridRef.current?.setColumns(buildColumns(BASE, n))}
          rowPresets={[100, 1000, 5000, 10000]}
        />
      }
    >
      {(reportState) => (
        <Grid
          ref={gridRef}
          rows={rows}
          columnDefs={BASE}
          getRowId={(r) => r.id}
          rowSelection="multiple"
          rowSelectWithPress
          showColumnGroupingControl
          aggFuncs={demoAggFuncs}
          onLayoutComplete={reportState}
        />
      )}
    </StoryScaffold>
  );
}
