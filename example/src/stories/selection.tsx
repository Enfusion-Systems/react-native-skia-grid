import * as React from "react";
import type { SkiaGridColumn } from "react-native-skia-grid";

import { StoryScaffold } from "../components/StoryScaffold";
import { basicColumns, makeRows, type Row } from "../seededData";
import { Grid } from "./_grid";

// A leading column with `checkboxSelection` renders per-row checkboxes (the grid
// pins it left and swaps in its checkbox cell renderer internally).
// `headerCheckboxSelection` adds the "select all" checkbox in the header.
//
// IMPORTANT: the checkbox column must use `colId: "selection"`. The grid injects
// its own selection column and de-duplicates the original by that exact colId;
// any other id makes the injected column accumulate on every re-render (you get
// multiple checkbox columns).
const COLUMNS: SkiaGridColumn<Row>[] = [
  { colId: "selection", field: "", name: "", width: 44, checkboxSelection: true, headerCheckboxSelection: true },
  ...basicColumns(),
];
const ROWS = makeRows(100);

export function SelectionStory(): React.ReactElement {
  return (
    <StoryScaffold
      title="Selection"
      description="Multi-row selection with checkboxes and select-all."
      instructions={[
        'rowSelection="multiple" + rowSelectWithPress — tap rows to toggle.',
        "Tap a row checkbox, or the header checkbox to select/clear all.",
        "Selection is keyed by row id and persists across scroll.",
      ]}
    >
      {(reportState) => (
        <Grid
          rows={ROWS}
          columnDefs={COLUMNS}
          getRowId={(r) => r.id}
          rowSelection="multiple"
          rowSelectWithPress
          onLayoutComplete={reportState}
        />
      )}
    </StoryScaffold>
  );
}
