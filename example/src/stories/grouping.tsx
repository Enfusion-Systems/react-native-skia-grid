import * as React from "react";

import { StoryScaffold } from "../components/StoryScaffold";
import { demoAggFuncs, groupableColumns, makeRows } from "../seededData";
import { Grid } from "./_grid";

// Grouping requires: `canGrouped: true` on the dimension columns, `aggFunc`
// (referencing a function in `aggFuncs`) on the measure columns, and
// `showColumnGroupingControl` to render the grouping pill bar above the header.
const COLUMNS = groupableColumns();
const ROWS = makeRows(200);

export function GroupingStory(): React.ReactElement {
  return (
    <StoryScaffold
      title="Grouping & aggregation"
      description="Group by a column; Qty=sum, Avg Px=avg aggregated per group."
      instructions={[
        "Tap Side/Status/Symbol header → Group to group rows by it.",
        "Tap a group row to expand / collapse it.",
        "The grouping pill bar shows the active grouping; Ungroup to remove.",
      ]}
    >
      {(reportState) => (
        <Grid
          rows={ROWS}
          columnDefs={COLUMNS}
          getRowId={(r) => r.id}
          rowSelection="single"
          showColumnGroupingControl
          // Register the aggregation functions referenced by column.aggFunc.
          aggFuncs={demoAggFuncs}
          onLayoutComplete={reportState}
        />
      )}
    </StoryScaffold>
  );
}
