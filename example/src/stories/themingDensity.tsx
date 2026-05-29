import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { darkTheme, lightTheme, type GridTheme } from "react-native-skia-grid";

import { StoryScaffold } from "../components/StoryScaffold";
import { basicColumns, makeRows } from "../seededData";
import { Grid } from "./_grid";

// Theme is a full token set (createTheme/darkTheme/lightTheme); density
// ("high" | "medium" | "low") scales row/header heights, font sizes and control
// padding. Both are plain props — swap them at run-time with the toggles below.
type DensityMode = "high" | "medium" | "low";
const COLUMNS = basicColumns();
const ROWS = makeRows(100);

export function ThemingDensityStory(): React.ReactElement {
  const [theme, setTheme] = React.useState<GridTheme>(darkTheme);
  const [density, setDensity] = React.useState<DensityMode>("medium");
  const isDark = theme === darkTheme;

  const controls = (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>Theme</Text>
        <Toggle id="theme-dark" label="Dark" active={isDark} onPress={() => setTheme(darkTheme)} />
        <Toggle id="theme-light" label="Light" active={!isDark} onPress={() => setTheme(lightTheme)} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Density</Text>
        {(["high", "medium", "low"] as DensityMode[]).map((d) => (
          <Toggle
            key={d}
            id={`density-${d}`}
            label={d}
            active={density === d}
            onPress={() => setDensity(d)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <StoryScaffold
      title="Theming & density"
      description="Swap theme (dark/light) and density (high/medium/low) at run-time."
      instructions={[
        "Toggle Dark / Light to change the full theme token set.",
        "Toggle density to rescale row height, fonts and padding.",
        "Visual-only — verified by eye / screenshot, not the state bridge.",
      ]}
      controls={controls}
    >
      {(reportState) => (
        <Grid
          theme={theme}
          density={density}
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

function Toggle({
  id,
  label,
  active,
  onPress,
}: {
  id: string;
  label: string;
  active: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable testID={id} onPress={onPress} style={[styles.btn, active && styles.btnActive]}>
      <Text style={[styles.btnText, active && styles.btnTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginVertical: 2 },
  label: { color: "#9a9aa2", fontSize: 12, width: 60 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 6,
    borderRadius: 6,
    backgroundColor: "#1d1d22",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#33333a",
  },
  btnActive: { backgroundColor: "#2f6fed", borderColor: "#2f6fed" },
  btnText: { color: "#cfcfd4", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  btnTextActive: { color: "#ffffff" },
});
