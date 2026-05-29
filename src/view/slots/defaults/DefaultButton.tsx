/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import { useRefCallback } from "../../../internal/hooks";
import * as React from "react";
import {
  ActivityIndicator,
  DimensionValue,
  InteractionManager,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { useGridTheme, useGridStyles, useTokens } from "../../../themes";
import {
  StyleablePressableProps,
  StyleablePressableThemed,
} from "./DefaultPressable";
import { ButtonText, FontSizeProp } from "./DefaultText";

type ButtonThemeOptions =
  | "primary"
  | "primary-invert"
  | "secondary"
  | "secondary-invert"
  | "info"
  | "basic"
  | "success"
  | "danger"
  | "warning";

type StyledPressableProps = React.ComponentProps<typeof StyleablePressableThemed> & {
  height?: number;
};

function StyledPressable({ height, style, ...rest }: StyledPressableProps) {
  const t = useTokens();
  const { pressable } = useGridStyles();
  const resolvedHeight = height ?? t.buttonHeight;
  return (
    <StyleablePressableThemed
      height={resolvedHeight}
      style={[pressable.root, { minHeight: resolvedHeight }, style as ViewStyle]}
      {...rest}
    />
  );
}

export type ButtonProps = Omit<StyleablePressableProps, "onPress" | "style"> & {
  onClick: VoidFunction;
  text?: string;
  buttonTheme?: ButtonThemeOptions;
  textStyles?: StyleProp<TextStyle>;
  containerStyles?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  pressedStyles?: ViewStyle;
  busy?: boolean;
  disabled?: boolean;
  height?: number;
  width?: number | DimensionValue;
  fontSize?: FontSizeProp | number;
  pointerEvents?: "auto" | "none" | "box-none";
};

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  buttonTheme = "secondary",
  text,
  textStyles,
  containerStyles,
  style,
  busy,
  height,
  width,
  disabled = false,
  fontSize,
  accessibilityLabel,
  ...props
}) => {
  const t = useTokens();
  const resolvedHeight = height ?? t.buttonHeight;
  const handlePress = useRefCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      onClick();
    });
  }, [onClick]);
  const theme = useGridTheme();

  return (
    <View style={[{ height: resolvedHeight, width }, containerStyles]}>
      <StyledPressable
        disabled={disabled || busy}
        // Icon-only buttons (children + a `text` label) render no visible text;
        // expose `text` as the accessibility label so screen readers — and
        // Detox by.label() — can identify them. Caller-supplied labels win.
        accessibilityLabel={accessibilityLabel ?? text}
        accessibilityRole="button"
        {...props}
        onPress={handlePress}
        buttonTheme={buttonTheme}
        height={resolvedHeight}
        style={style as any}
      >
        {busy ? (
          <ActivityIndicator size={22} color={theme.cellTextColor} />
        ) : (
          children ||
          (text ? (
            <ButtonText
              style={textStyles}
              numberOfLines={1}
              disabled={disabled}
              fontSize={fontSize}
            >
              {text}
            </ButtonText>
          ) : null)
        )}
      </StyledPressable>
    </View>
  );
};

export const DefaultButton = Button;
