import * as React from "react";
import type { CellEditingStoppedEvent } from "react-native-skia-grid";

import { StoryScaffold } from "../components/StoryScaffold";
import { editableColumns, makeRows, type Row } from "../seededData";
import { Grid } from "./_grid";

// `editable: true` on a column makes its cells open an editor on tap. The grid
// reports `editingCell: { rowId, colId }` while editing, and fires
// `onCellEditingStopped` on commit/cancel.
const COLUMNS = editableColumns();
const ROWS = makeRows(50);

export function CellEditingStory(): React.ReactElement {
  const onStopped = React.useCallback(
    (e: CellEditingStoppedEvent<Row>) => {
      // In a real app you'd persist e.newValue here. Kept as a no-op log so the
      // story stays self-contained and deterministic.
      if (e.valueChanged) {
        // eslint-disable-next-line no-console
        console.log("cell edit committed", e.colDef?.colId, e.newValue);
      }
    },
    []
  );

  return (
    <StoryScaffold
      title="Cell editing"
      description="Tap an editable cell (Qty / Price / Status) to edit its value."
      instructions={[
        "Tap a Qty / Price / Status cell to open the editor.",
        "editingCell { rowId, colId } is reported while editing.",
        "Commit saves (onCellEditingStopped); cancel discards.",
      ]}
    >
      {(reportState) => (
        <Grid
          rows={ROWS}
          columnDefs={COLUMNS}
          getRowId={(r) => r.id}
          onCellEditingStopped={onStopped}
          onLayoutComplete={reportState}
        />
      )}
    </StoryScaffold>
  );
}
