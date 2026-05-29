import * as React from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Grid,
  GridThemeProvider,
  type GridReportableState,
  darkTheme,
} from "react-native-skia-grid";

import { StateBridge } from "../StateBridge";
import { basicColumns, makeRows, type Row } from "../seededData";

const ROWS = makeRows(100);
const COLUMNS = basicColumns();

export function BasicScene(): React.ReactElement {
  const [state, setState] = React.useState<GridReportableState | null>(null);

  const handleLayoutComplete = React.useCallback(
    (s: GridReportableState) => setState(s),
    []
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <GridThemeProvider theme={darkTheme}>
        <View style={styles.gridContainer} testID="grid-root">
          <Grid<Row>
            columnDefs={COLUMNS}
            rows={ROWS}
            getRowId={(row) => row.id}
            rowSelection="single"
            onLayoutComplete={handleLayoutComplete}
          />
        </View>
      </GridThemeProvider>
      <StateBridge state={state} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0c0e" },
  gridContainer: { flex: 1 },
});
