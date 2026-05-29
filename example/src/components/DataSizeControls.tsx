import * as React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * Runtime row/column count controls (the "increase rows/columns at run-time"
 * requirement). Purely presentational: it tracks the current counts and calls
 * back to the story, which applies them to the grid:
 *   - rows  → the story re-passes a controlled `rows` prop (grid reacts to it),
 *   - cols  → the story calls the imperative `gridRef.current.setColumns(...)`
 *             (the grid only bootstraps `columnDefs` once at mount).
 *
 * Every control carries a stable testID so Detox can drive it:
 *   rows-preset-<n>, rows-inc, rows-dec, rows-count,
 *   cols-inc, cols-dec, cols-count.
 * Both effects are observable through GridReportableState (`rowCount`,
 * `columnIds`), so the runtime changes are fully e2e-assertable.
 */
type DataSizeControlsProps = {
  initialRows: number;
  initialCols: number;
  onRows: (count: number) => void;
  onCols: (count: number) => void;
  rowPresets?: number[];
  rowStep?: number;
  minCols?: number;
  maxCols?: number;
};

export function DataSizeControls({
  initialRows,
  initialCols,
  onRows,
  onCols,
  rowPresets = [0, 1, 100, 1000, 10000],
  rowStep = 50,
  minCols = 1,
  maxCols = 24,
}: DataSizeControlsProps): React.ReactElement {
  const [rows, setRows] = React.useState(initialRows);
  const [cols, setCols] = React.useState(initialCols);

  const applyRows = React.useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.round(next));
      setRows(clamped);
      onRows(clamped);
    },
    [onRows]
  );

  const applyCols = React.useCallback(
    (next: number) => {
      const clamped = Math.min(maxCols, Math.max(minCols, Math.round(next)));
      setCols(clamped);
      onCols(clamped);
    },
    [onCols, minCols, maxCols]
  );

  const fmt = (n: number) => (n >= 1000 ? `${n / 1000}k` : `${n}`);

  return (
    <View>
      {/* Rows */}
      <View style={styles.row}>
        <Text style={styles.label}>Rows</Text>
        <Text style={styles.count} testID="rows-count">
          {rows}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Btn id="rows-dec" label="−" onPress={() => applyRows(rows - rowStep)} />
          {rowPresets.map((preset) => (
            <Btn
              key={preset}
              id={`rows-preset-${preset}`}
              label={fmt(preset)}
              active={rows === preset}
              onPress={() => applyRows(preset)}
            />
          ))}
          <Btn id="rows-inc" label="+" onPress={() => applyRows(rows + rowStep)} />
        </ScrollView>
      </View>

      {/* Columns */}
      <View style={styles.row}>
        <Text style={styles.label}>Cols</Text>
        <Text style={styles.count} testID="cols-count">
          {cols}
        </Text>
        <Btn id="cols-dec" label="−" onPress={() => applyCols(cols - 1)} />
        <Btn id="cols-inc" label="+" onPress={() => applyCols(cols + 1)} />
      </View>
    </View>
  );
}

function Btn({
  id,
  label,
  active,
  onPress,
}: {
  id: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      testID={id}
      onPress={onPress}
      style={[styles.btn, active && styles.btnActive]}
    >
      <Text style={[styles.btnText, active && styles.btnTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
  label: { color: "#9a9aa2", fontSize: 12, width: 38 },
  count: {
    color: "#e8e8ea",
    fontSize: 12,
    fontWeight: "700",
    width: 48,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    borderRadius: 6,
    backgroundColor: "#1d1d22",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#33333a",
  },
  btnActive: { backgroundColor: "#2f6fed", borderColor: "#2f6fed" },
  btnText: { color: "#cfcfd4", fontSize: 12, fontWeight: "600" },
  btnTextActive: { color: "#ffffff" },
});
