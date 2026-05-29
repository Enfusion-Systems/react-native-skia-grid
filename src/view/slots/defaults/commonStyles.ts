import * as React from "react";
import { StyleSheet, ViewStyle } from "react-native";

import { useTokens } from "../../../themes";

export type CommonStyles = {
  flexOne: ViewStyle;
  flexRow: ViewStyle;
  fullWidth: ViewStyle;
  halfWidth: ViewStyle;
  elevated: ViewStyle;
  elevatedLow: ViewStyle;
  formSpacing: ViewStyle;
  marginRightFive: ViewStyle;
  marginLeftFive: ViewStyle;
  marginTopFive: ViewStyle;
  marginBottomFive: ViewStyle;
  marginRightTen: ViewStyle;
  marginLeftTen: ViewStyle;
  marginTopTen: ViewStyle;
  marginBottomTen: ViewStyle;
  marginZero: ViewStyle;
  marginVerticalFive: ViewStyle;
  marginVerticalTen: ViewStyle;
  marginHorizontalFive: ViewStyle;
  marginHorizontalTen: ViewStyle;
  paddingRightFive: ViewStyle;
  paddingLeftFive: ViewStyle;
  paddingTopFive: ViewStyle;
  paddingBottomFive: ViewStyle;
  paddingRightTen: ViewStyle;
  paddingLeftTen: ViewStyle;
  paddingTopTen: ViewStyle;
  paddingBottomTen: ViewStyle;
  paddingZero: ViewStyle;
  paddingFive: ViewStyle;
  paddingTen: ViewStyle;
  paddingVerticalFive: ViewStyle;
  paddingVerticalTen: ViewStyle;
  paddingHorizontalFive: ViewStyle;
  paddingHorizontalTen: ViewStyle;
};

export function useCommonStyles(): CommonStyles {
  const t = useTokens();
  return React.useMemo(
    () =>
      StyleSheet.create({
        flexOne: { flex: 1 },
        flexRow: { flexDirection: "row" },
        fullWidth: { width: "100%" },
        halfWidth: { width: "50%" },
        elevated: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 5 },
          shadowRadius: 6.27,
          elevation: 10,
        },
        elevatedLow: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 4,
          elevation: 4,
        },
        formSpacing: { marginTop: t.spacingXl + 3 },  // 15 at medium
        marginRightFive: { marginRight: t.spacing + 1 },   // 5 at medium
        marginLeftFive: { marginLeft: t.spacing + 1 },
        marginTopFive: { marginTop: t.spacing + 1 },
        marginBottomFive: { marginBottom: t.spacing + 1 },
        marginRightTen: { marginRight: t.spacingXl - 2 },  // 10 at medium
        marginLeftTen: { marginLeft: t.spacingXl - 2 },
        marginTopTen: { marginTop: t.spacingXl - 2 },
        marginBottomTen: { marginBottom: t.spacingXl - 2 },
        marginZero: { margin: 0 },
        marginVerticalFive: { marginVertical: t.spacing + 1 },
        marginVerticalTen: { marginVertical: t.spacingXl - 2 },
        marginHorizontalFive: { marginHorizontal: t.spacing + 1 },
        marginHorizontalTen: { marginHorizontal: t.spacingXl - 2 },
        paddingRightFive: { paddingRight: t.spacing + 1 },
        paddingLeftFive: { paddingLeft: t.spacing + 1 },
        paddingTopFive: { paddingTop: t.spacing + 1 },
        paddingBottomFive: { paddingBottom: t.spacing + 1 },
        paddingRightTen: { paddingRight: t.spacingXl - 2 },
        paddingLeftTen: { paddingLeft: t.spacingXl - 2 },
        paddingTopTen: { paddingTop: t.spacingXl - 2 },
        paddingBottomTen: { paddingBottom: t.spacingXl - 2 },
        paddingZero: { padding: 0 },
        paddingFive: { padding: t.spacing + 1 },
        paddingTen: { padding: t.spacingXl - 2 },
        paddingVerticalFive: { paddingVertical: t.spacing + 1 },
        paddingVerticalTen: { paddingVertical: t.spacingXl - 2 },
        paddingHorizontalFive: { paddingHorizontal: t.spacing + 1 },
        paddingHorizontalTen: { paddingHorizontal: t.spacingXl - 2 },
      }),
    [t]
  );
}

// Static fallback for callers that haven't migrated to useCommonStyles() yet.
// Values fixed at "medium" equivalents (5 and 10) to preserve pixel-identical behavior
// during the migration. Will be removed once all callers use useCommonStyles().
export const commonStyles = StyleSheet.create({
  flexOne: { flex: 1 },
  flexRow: { flexDirection: "row" },
  fullWidth: { width: "100%" },
  halfWidth: { width: "50%" },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 6.27,
    elevation: 10,
  },
  elevatedLow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 4,
  },
  formSpacing: { marginTop: 15 },
  marginRightFive: { marginRight: 5 },
  marginLeftFive: { marginLeft: 5 },
  marginTopFive: { marginTop: 5 },
  marginBottomFive: { marginBottom: 5 },
  marginRightTen: { marginRight: 10 },
  marginLeftTen: { marginLeft: 10 },
  marginTopTen: { marginTop: 10 },
  marginBottomTen: { marginBottom: 10 },
  marginZero: { margin: 0 },
  marginVerticalFive: { marginVertical: 5 },
  marginVerticalTen: { marginVertical: 10 },
  marginHorizontalFive: { marginHorizontal: 5 },
  marginHorizontalTen: { marginHorizontal: 10 },
  paddingRightFive: { paddingRight: 5 },
  paddingLeftFive: { paddingLeft: 5 },
  paddingTopFive: { paddingTop: 5 },
  paddingBottomFive: { paddingBottom: 5 },
  paddingRightTen: { paddingRight: 10 },
  paddingLeftTen: { paddingLeft: 10 },
  paddingTopTen: { paddingTop: 10 },
  paddingBottomTen: { paddingBottom: 10 },
  paddingZero: { padding: 0 },
  paddingFive: { padding: 5 },
  paddingTen: { padding: 10 },
  paddingVerticalFive: { paddingVertical: 5 },
  paddingVerticalTen: { paddingVertical: 10 },
  paddingHorizontalFive: { paddingHorizontal: 5 },
  paddingHorizontalTen: { paddingHorizontal: 10 },
});
