import * as React from "react";

import { StoryScaffold } from "../components/StoryScaffold";
import { filterColumns, makeRows } from "../seededData";
import { Grid } from "./_grid";

// `canFilter: true` + a `filterType` per column drives the Filter sub-screen.
// This story shows all four filter UIs: set (symbol, side), text (trader),
// number (quantity), date (updatedAt).
const COLUMNS = filterColumns();
const ROWS = makeRows(100);

export function FilteringStory(): React.ReactElement {
  return (
    <StoryScaffold
      title="Filtering"
      description="Set, text, number and date filters — one filterType per column."
      instructions={[
        "Tap a header → Filter to open that column's filter UI.",
        "Symbol/Side = set filter; Trader = text; Qty = number; Updated = date.",
        "Active filters reduce the visible row count; Clear Filters resets one.",
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
