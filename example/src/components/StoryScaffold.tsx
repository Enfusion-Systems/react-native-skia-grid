import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { GridReportableState } from "react-native-skia-grid";

import { StateBridge } from "../StateBridge";

/**
 * Shared chrome for every showcase story:
 *  - an instruction banner (on-screen guidance describing what to try),
 *  - an optional controls bar (e.g. DataSizeControls or theme toggles),
 *  - the live grid inside a `testID="grid-root"` container (Detox taps/swipes
 *    are projected onto this view's frame),
 *  - the hidden `StateBridge` that exposes GridReportableState to e2e.
 *
 * Stories receive `reportState` via render-prop and wire it to the grid's
 * `onLayoutComplete` so every story reports state uniformly. The native-stack
 * header supplies the top safe-area + back navigation, so we only inset the
 * bottom here.
 */
type StoryScaffoldProps = {
  title: string;
  description: string;
  /** Short, action-oriented bullets: "Tap a header to sort", etc. */
  instructions?: string[];
  /** Optional control bar rendered above the grid (DataSizeControls, toggles). */
  controls?: React.ReactNode;
  children: (reportState: (state: GridReportableState) => void) => React.ReactNode;
};

export function StoryScaffold({
  title,
  description,
  instructions,
  controls,
  children,
}: StoryScaffoldProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [state, setState] = React.useState<GridReportableState | null>(null);
  const reportState = React.useCallback(
    (next: GridReportableState) => setState(next),
    []
  );

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.banner} testID="story-banner">
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
        {instructions && instructions.length > 0 ? (
          <View style={styles.instructions}>
            {instructions.map((line) => (
              <Text key={line} style={styles.instruction}>
                {`•  ${line}`}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {controls ? <View style={styles.controls}>{controls}</View> : null}

      <View style={styles.gridContainer} testID="grid-root">
        {children(reportState)}
      </View>

      <StateBridge state={state} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0c0e" },
  banner: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a30",
  },
  title: { color: "#e8e8ea", fontSize: 16, fontWeight: "700" },
  desc: { color: "#9a9aa2", fontSize: 12, marginTop: 2 },
  instructions: { marginTop: 6 },
  instruction: { color: "#7fb2ff", fontSize: 11, lineHeight: 16 },
  controls: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a30",
  },
  gridContainer: { flex: 1 },
});
