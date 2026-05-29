/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import { useRefCallback } from "../../../internal/hooks";
import * as React from "react";
import {
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { useGridTheme, useTokens } from "../../../themes";

type HitSlop =
  | number
  | Partial<
      Record<
        "left" | "right" | "top" | "bottom" | "vertical" | "horizontal",
        number
      >
    >
  | Record<"width" | "left", number>
  | Record<"width" | "right", number>
  | Record<"height" | "top", number>
  | Record<"height" | "bottom", number>;

export type StyleablePressableBaseProps = React.PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  baseStyle?: StyleProp<ViewStyle>;
  buttonTheme?: string;
  active?: boolean;
  disabled?: boolean;
  baseColorOverride?: string;
  hoverColorOverride?: string;
  disabledBgColor?: string;
  colors?: [string, string];
  pressedStyles?: ViewStyle;
  containerStyles?: StyleProp<ViewStyle>;
  baseContainerStyles?: StyleProp<ViewStyle>;
  onPress?: VoidFunction;
  onPressIn?: VoidFunction;
  onPressOut?: VoidFunction;
  onLongPress?: VoidFunction;
  hitSlop?: HitSlop;
  allowPointerEvents?: boolean;
}>;

export type StyleablePressableProps = Omit<
  StyleablePressableBaseProps,
  "baseStyle" | "baseContainerStyles" | "allowPointerEvents"
> & {
  height?: number;
};

export const StyleablePressableBase = React.forwardRef<
  View,
  StyleablePressableBaseProps
>(function StyleablePressableBase(
  {
    baseStyle = {},
    baseContainerStyles = {},
    children,
    style,
    pressedStyles,
    onPressIn,
    onPressOut,
    onPress,
    onLongPress,
    disabled,
    containerStyles,
    hitSlop = 0,
    allowPointerEvents = false,
  },
  ref
) {
  const pressCalled = React.useRef(false);
  const [pressed, setPressed] = React.useState(false);

  const cleanUp = useRefCallback(() => {
    pressCalled.current = false;
  }, [pressCalled]);

  const tapGesture = React.useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .enabled(!disabled)
        .maxDistance(50)
        .shouldCancelWhenOutside(false)
        .hitSlop(hitSlop)
        .onStart(() => {
          onPressIn?.();
          setPressed(true);
        })
        .onEnd((e, success) => {
          if (success) {
            pressCalled.current = true;
            onPress?.();
          }
          onPressOut?.();
        })
        .onFinalize(() => {
          setTimeout(() => {
            setPressed(false);
          }, 200);
          cleanUp();
        }),
    [onPressIn, onPress, onPressOut, cleanUp, disabled]
  );

  const longPressGesture = React.useMemo(
    () =>
      Gesture.LongPress()
        .runOnJS(true)
        .enabled(!disabled)
        .minDuration(800)
        .shouldCancelWhenOutside(false)
        .hitSlop(hitSlop)
        .maxDistance(50)
        .onStart(() => {
          setPressed(true);
        })
        .onEnd((_e, success) => {
          if (success) onLongPress?.();
        })
        .onFinalize((_e, success) => {
          if (success) onPressOut?.();
          setTimeout(() => {
            setPressed(false);
          }, 200);
          cleanUp();
        }),
    [setPressed, onLongPress, onPressOut, cleanUp, disabled]
  );

  return (
    <GestureDetector gesture={Gesture.Exclusive(longPressGesture, tapGesture)}>
      <View ref={ref} style={[baseContainerStyles, containerStyles]}>
        <View
          pointerEvents={allowPointerEvents ? "auto" : "none"}
          style={[baseStyle, style, pressed ? pressedStyles : {}]}
        >
          {children}
        </View>
      </View>
    </GestureDetector>
  );
});

export const StyleablePressable = React.forwardRef<View, StyleablePressableProps>(
  function StyleablePressable({ children, height, ...rest }, ref) {
    const t = useTokens();
    const resolvedHeight = height ?? t.inputHeight;
    return (
      <StyleablePressableBase
        ref={ref}
        baseContainerStyles={{ width: "100%", minHeight: resolvedHeight }}
        baseStyle={{ height: resolvedHeight, width: "100%" }}
        {...rest}
      >
        {children}
      </StyleablePressableBase>
    );
  }
);

export const StyleablePressableThemed: React.FC<StyleablePressableProps> = ({
  style,
  buttonTheme = "secondary",
  active = false,
  disabled = false,
  disabledBgColor,
  baseColorOverride,
  hoverColorOverride,
  children,
  colors,
  pressedStyles,
  ...props
}) => {
  const theme = useGridTheme();

  const [baseColor, hoverColor] = React.useMemo(() => {
    if (buttonTheme === "primary") return [theme.accentColor, theme.accentHoverColor];
    if (buttonTheme === "primary-invert")
      return [theme.accentHoverColor, theme.accentColor];
    if (buttonTheme === "success") return [theme.accentColor, theme.accentHoverColor];
    if (buttonTheme === "danger") return [theme.dangerColor, theme.dangerColor];
    if (buttonTheme === "warning") return [theme.accentColor, theme.accentHoverColor];
    if (buttonTheme === "info") return [theme.accentColor, theme.accentHoverColor];
    if (buttonTheme === "basic")
      return ["transparent", theme.backgroundHoverColor];
    if (buttonTheme === "secondary-invert")
      return [theme.backgroundHoverColor, theme.backgroundTertiaryColor];
    return (
      colors ?? [theme.backgroundTertiaryColor, theme.backgroundHoverColor]
    );
  }, [colors, buttonTheme, theme, active]);

  return (
    <StyleablePressable
      {...props}
      disabled={disabled}
      style={[
        {
          backgroundColor:
            disabled && !active
              ? (disabledBgColor ?? theme.backgroundColor)
              : baseColorOverride || baseColor,
        },
        style,
      ]}
      pressedStyles={{
        backgroundColor: disabled
          ? (disabledBgColor ?? theme.backgroundColor)
          : hoverColorOverride || hoverColor,
        ...(pressedStyles ?? {}),
      }}
    >
      {children}
    </StyleablePressable>
  );
};

export const DefaultPressable = StyleablePressable;
