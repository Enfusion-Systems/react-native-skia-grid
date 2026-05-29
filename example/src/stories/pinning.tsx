import * as React from "react";

import { StoryScaffold } from "../components/StoryScaffold";
import { basicColumns, makeRows } from "../seededData";
import { Grid } from "./_grid";

// `canPinned: true` enables the "Pin Column" action; the pin sub-screen offers
// left / right / unpin. Pinned columns stay fixed during horizontal scroll.
const COLUMNS = basicColumns();
const ROWS = makeRows(100);

export function PinningStory(): React.ReactElement {
  return (
    <StoryScaffold
      title="Pinning"
      description="Pin columns left or right; pinned columns stay put while scrolling."
      instructions={[
        "Tap a header → Pin Column → Left / Right.",
        "Pin a column right, then scroll horizontally — it stays anchored.",
        "Re-open Pin Column to unpin.",
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
