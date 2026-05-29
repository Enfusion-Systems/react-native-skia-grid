import * as React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { SkiaGridAPI } from "react-native-skia-grid";

import { StoryScaffold } from "../components/StoryScaffold";
import { basicColumns, makeRows, type Row } from "../seededData";
import { Grid } from "./_grid";

// Everything here goes through the grid's imperative ref (SkiaGridAPI<Row>).
// Only methods that actually exist on the API are used (no exportToCsv /
// selectAll — those aren't part of SkiaGridAPI).
const COLUMNS = basicColumns();
const INITIAL = makeRows(100);

export function ImperativeApiStory(): React.ReactElement {
  const gridRef = React.useRef<SkiaGridAPI<Row> | null>(null);
  const addedRef = React.useRef(0);

  const addRow = () => {
    const n = (addedRef.current += 1);
    const row: Row = { ...makeRows(1, 1000 + n)[0], id: `added-${n}` };
    gridRef.current?.applyTransaction({ add: [row], addIndex: 0 });
  };
  const reset = () => {
    addedRef.current = 0;
    gridRef.current?.setRowsData(makeRows(100));
  };
  const clear = () => gridRef.current?.clearRows();
  const deselect = () => gridRef.current?.deselectAll();
  const scrollToEnd = () => gridRef.current?.scrollToRowIndex(99);

  const controls = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Btn id="api-add" label="Add row" onPress={addRow} />
      <Btn id="api-reset" label="Reset 100" onPress={reset} />
      <Btn id="api-clear" label="Clear" onPress={clear} />
      <Btn id="api-deselect" label="Deselect" onPress={deselect} />
      <Btn id="api-scroll" label="Scroll → 99" onPress={scrollToEnd} />
    </ScrollView>
  );

  return (
    <StoryScaffold
      title="Imperative API"
      description="Drive the grid programmatically through its ref (SkiaGridAPI)."
      instructions={[
        "Add row → applyTransaction({ add, addIndex: 0 }) (prepends).",
        "Reset / Clear → setRowsData / clearRows; Deselect → deselectAll.",
        "Scroll → 99 → scrollToRowIndex(99). rowCount reflects every change.",
      ]}
      controls={controls}
    >
      {(reportState) => (
        <Grid
          ref={gridRef}
          rows={INITIAL}
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

function Btn({
  id,
  label,
  onPress,
}: {
  id: string;
  label: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable testID={id} onPress={onPress} style={styles.btn}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 6,
    backgroundColor: "#1d1d22",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#33333a",
  },
  btnText: { color: "#cfcfd4", fontSize: 12, fontWeight: "600" },
});
