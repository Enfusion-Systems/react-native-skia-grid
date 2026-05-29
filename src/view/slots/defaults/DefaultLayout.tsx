/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import * as React from "react";
import {
  SafeAreaView,
  SafeAreaViewProps,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewProps,
} from "react-native";

import type { DividerSlotProps } from "../types";
import { useGridStyles, useGridTheme } from "../../../themes";

export function FullView({ fillHeight = true, style, children, ...rest }: ViewProps & { fillHeight?: boolean }) {
  return (
    <View {...rest} style={[fillHeight ? styles.fullView : styles.fullViewAuto, style]}>
      {children}
    </View>
  );
}

export function FlexView({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.flex1, style]}>
      {children}
    </View>
  );
}

export function FlexGrowView({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.flexGrow1, style]}>
      {children}
    </View>
  );
}

export function SafeContentContainer({ style, children, ...rest }: SafeAreaViewProps) {
  return (
    <SafeAreaView {...rest} style={[styles.flex1, style]}>
      {children}
    </SafeAreaView>
  );
}

export function CenterContent({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.centerContent, style]}>
      {children}
    </View>
  );
}

export function HR({ style, ...rest }: ViewProps) {
  const { hr } = useGridStyles();
  return <View {...rest} style={[hr.root, style]} />;
}

export const FlexGrowContentScrollView: React.FC<ScrollViewProps> = ({
  children,
  ...props
}) => (
  <ScrollView contentContainerStyle={styles.flexGrow1} {...props}>
    {children}
  </ScrollView>
);

export function Divider({ style, ...rest }: DividerSlotProps) {
  const theme = useGridTheme();

  return (
    <View
      style={[styles.divider, { backgroundColor: theme.borderColor }, style]}
      {...rest}
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullView:      { width: "100%", height: "100%" },
  fullViewAuto:  { width: "100%", height: "auto" },
  flex1:         { flex: 1 },
  flexGrow1:     { flexGrow: 1 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  divider:       { height: 1, width: "100%" },
});
