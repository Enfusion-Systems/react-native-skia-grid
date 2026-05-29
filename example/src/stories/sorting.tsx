import * as React from "react";

import { StoryScaffold } from "../components/StoryScaffold";
import { basicColumns, makeRows } from "../seededData";
import { Grid } from "./_grid";

// `sortable: true` on every column (set in basicColumns) is what makes the
// "Asc / Desc / Clear Sorting" row appear in the column action sheet.
const COLUMNS = basicColumns();
const ROWS = makeRows(100);

export function SortingStory(): React.ReactElement {
  return (
    <StoryScaffold
      title="Sorting"
      description="Single- and multi-column sorting via the header action sheet."
      instructions={[
        "Tap a header → Asc / Desc / Clear Sorting.",
        "Long-press Asc/Desc to ADD a column to the multi-sort chain.",
        "Sort precedence follows the order you long-press the columns.",
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
