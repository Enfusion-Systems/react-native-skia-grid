import * as React from "react";
import { StyleSheet, View, ViewProps, ViewStyle } from "react-native";

import {
  Button,
  ButtonProps,
  FormElementContainer,
  NormalFontAwesomeIcon,
  NormalFontAwesomeIconProps,
  NormalText,
  NormalTextProps,
  TopBar,
} from "../../slots/defaults";
import { useGridStyles } from "../../../themes";

export function ActionContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.actionContainer, style]}>
      {children}
    </View>
  );
}

type FormButtonContainerProps = React.ComponentProps<typeof FormElementContainer> & {
  hasTopBorder?: boolean;
};

export function FormButtonContainer({ hasTopBorder, style, ...rest }: FormButtonContainerProps) {
  const { formAction } = useGridStyles();
  return (
    <FormElementContainer
      {...rest}
      style={[
        formAction.buttonContainerBase,
        hasTopBorder ? formAction.buttonContainerTopBorder : formAction.buttonContainerNoTopBorder,
        style as ViewStyle,
      ]}
    />
  );
}

export function StyledFontAwesomeIcon(props: NormalFontAwesomeIconProps) {
  return <NormalFontAwesomeIcon {...props} style={[styles.iconMarginRight, props.style as any]} />;
}

export function StyledButton(props: ButtonProps) {
  return <Button {...props} style={[styles.buttonPadding, props.style as ViewStyle]} />;
}

export function StyledText(props: React.ComponentProps<typeof NormalText> & NormalTextProps) {
  const { style, ...rest } = props;
  return <NormalText style={[styles.flex1, style]} {...rest} />;
}

type StyledTopBarProps = React.ComponentProps<typeof TopBar>;

export function StyledTopBar(props: StyledTopBarProps) {
  const { formAction } = useGridStyles();
  return <TopBar {...props} style={[formAction.topBar, props.style as ViewStyle]} />;
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  actionContainer:  { width: "100%", flexDirection: "row", justifyContent: "center", alignItems: "center" },
  iconMarginRight:  { marginRight: 5 },
  buttonPadding:    { paddingHorizontal: 12 },
  flex1:            { flex: 1 },
});
