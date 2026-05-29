import * as React from "react";
import { View } from "react-native";
import type { GridReportableState } from "react-native-skia-grid";

export const STATE_BRIDGE_TEST_ID = "grid-state";

type Props = {
  state: GridReportableState | null;
};

/**
 * Hidden View that exposes the grid's reportable state to Detox.
 * Detox reads `accessibilityLabel` via `element(by.id(...)).getAttributes()`;
 * specs JSON.parse the label back into a typed snapshot.
 *
 * Note: we deliberately do NOT set `accessibilityElementsHidden` /
 * `importantForAccessibility="no"` here — those properties also hide the
 * element from Detox's view matcher on iOS.
 */
export function StateBridge({ state }: Props): React.ReactElement {
  const label = React.useMemo(
    () => (state ? JSON.stringify(state) : ""),
    [state]
  );
  return (
    <View
      testID={STATE_BRIDGE_TEST_ID}
      accessible
      accessibilityLabel={label}
      style={{ width: 1, height: 1, opacity: 0, position: "absolute" }}
    />
  );
}
