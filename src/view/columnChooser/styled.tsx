import * as React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
  VirtualizedList,
} from "react-native";

import {
  Button,
  ButtonProps,
  StyleablePressable,
  StyleablePressableProps,
  TopBar,
} from "../slots/defaults";
import { useGridTheme, useTokens } from "../../themes";

export function Row({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[localStyles.row, style]}>
      {children}
    </View>
  );
}

type MenuItemContainerProps = ViewProps & { isDragged: boolean };

export function MenuItemContainer({ isDragged, style, children, ...rest }: MenuItemContainerProps) {
  const t = useTokens();
  const theme = useGridTheme();
  return (
    <View
      {...rest}
      style={[
        {
          height: t.compactControlHeight,
          paddingHorizontal: t.spacing + 1,
          borderColor: theme.borderColor,
          borderRadius: t.radiusSubtle,
          backgroundColor: isDragged ? theme.accentHoverColor : theme.rowAlternateBackgroundColor,
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type MenuItemOuterContainerProps = TouchableOpacityProps & { top?: boolean };

export function MenuItemOuterContainer({ top = false, style, children, ...rest }: MenuItemOuterContainerProps) {
  const t = useTokens();
  return (
    <TouchableOpacity
      {...rest}
      style={[
        {
          marginTop: top ? t.spacing + 1 : 0,
          height: t.compactControlHeight,
          marginBottom: t.spacing + 1,
          paddingHorizontal: t.spacing + 1,
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
}

export function useStylesheet() {
  const t = useTokens();
  return React.useMemo(
    () =>
      StyleSheet.create({
        clickTarget: {
          height: t.clickTargetSize,
          width: t.clickTargetSize,
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [t]
  );
}

// Static stylesheet kept for callers that use it without hooks (e.g. style references)
export const stylesheet = StyleSheet.create({
  clickTarget: {
    height: 30,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});

export function ClickTarget(props: StyleablePressableProps) {
  const t = useTokens();
  return (
    <StyleablePressable
      height={t.clickTargetSize}
      containerStyles={{ width: t.clickTargetSize }}
      pressedStyles={{ opacity: 0.8 }}
      style={[{ alignItems: "center", justifyContent: "center" }, props.style]}
      {...props}
    />
  );
}

type FilterModalButtonContainerProps = ButtonProps;

export function FilterModalButtonContainer(props: FilterModalButtonContainerProps) {
  const t = useTokens();
  const theme = useGridTheme();
  return (
    <Button
      {...props}
      style={[
        {
          width: 50,
          padding: t.spacingXxl,
          backgroundColor: theme.rowAlternateBackgroundColor,
          marginLeft: t.spacingXl - 2,
          borderRadius: t.radius,
        },
        props.style,
      ]}
    />
  );
}

export function MultiInputContainer({ style, children, ...rest }: ViewProps) {
  const t = useTokens();
  return (
    <View
      {...rest}
      style={[
        { flexDirection: "row", justifyContent: "space-between", padding: t.spacing + 1 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type FilterContainerProps = ViewProps & { containerHeight: number };

export function FilterContainer({ containerHeight, style, children, ...rest }: FilterContainerProps) {
  const t = useTokens();
  return (
    <View {...rest} style={[{ padding: t.sectionPadding, height: containerHeight }, style]}>
      {children}
    </View>
  );
}

// Re-export StyledTopBar from shared formActionStyles to avoid duplication
export { StyledTopBar } from "../columnActions/shared/formActionStyles";

type VirtualizedListContainerProps = React.ComponentProps<typeof VirtualizedList>;

export function VirtualizedListContainer(props: VirtualizedListContainerProps) {
  return (
    <VirtualizedList
      style={[localStyles.virtualList, props.style as any]}
      {...props}
    />
  );
}

type FooterProps = ViewProps & { bottomOffset: number };

export function Footer({ bottomOffset, style, children, ...rest }: FooterProps) {
  const t = useTokens();
  const theme = useGridTheme();
  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: "row",
          maxHeight: bottomOffset + 46,
          justifyContent: "center",
          alignContent: "center",
          marginTop: t.borderThin,
          padding: t.spacing + 1,
          paddingBottom: bottomOffset + t.spacing + 1,
          backgroundColor: theme.backgroundColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AccordionListViewContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[localStyles.accordionListView, style]}>
      {children}
    </View>
  );
}

export const accordionStyles = StyleSheet.create({
  accordionTitle: {},
  topOne: { borderTopWidth: 1 },
  topZero: { borderTopWidth: 0 },
});

// ─── Styles ────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  row:                 { flexDirection: "row", flexWrap: "nowrap", alignItems: "center" },
  virtualList:         { flex: 1, flexDirection: "column", height: "100%" },
  accordionListView:   { flex: 1, width: "100%", flexDirection: "column" },
});
