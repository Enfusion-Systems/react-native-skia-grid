import * as React from "react";

import { StoryScaffold } from "../components/StoryScaffold";
import { customRenderColumns, makeRows } from "../seededData";
import { Grid } from "./_grid";

// Custom cell DISPLAY without a full Skia cellRenderer:
//   - `valueFormatter({ row, column, value }) => string` reshapes the text
//     (currency, thousands separators, signed P&L),
//   - `redIfNegative: true` colours negative values with the theme danger token.
//
// For fully custom drawing, a column can instead take `cellRenderer(args, ctx)`
// and use the exported drawing utils (drawText, getFillPaint, clipCell …) from
// "react-native-skia-grid". That's the advanced path; valueFormatter covers the
// common "format this value" case shown here.
const COLUMNS = customRenderColumns();
const ROWS = makeRows(100);

export function CustomRenderersStory(): React.ReactElement {
  return (
    <StoryScaffold
      title="Custom cell rendering"
      description="valueFormatter (currency / thousands / signed) + redIfNegative P&L."
      instructions={[
        "Price → $-formatted; Notional → thousands separators.",
        "P&L → signed, and negative values render red (redIfNegative).",
        "See customRenderColumns() in seededData.ts for the config.",
      ]}
    >
      {(reportState) => (
        <Grid
          rows={ROWS}
          columnDefs={COLUMNS}
          getRowId={(r) => r.id}
          rowSelection="single"
          onLayoutComplete={reportState}
        />
      )}
    </StoryScaffold>
  );
}
