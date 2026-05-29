/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import {
  FontAwesomeIcon,
  Props as FontAwesomeIconProps,
} from "@fortawesome/react-native-fontawesome";
import * as React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewProps,
} from "react-native";

import type { GridTheme } from "../../../themes";
import { useGridTheme } from "../../../themes";

// Kept as a static export for backward compat while callers are migrated to useTokens().inputHeight
export const DEFAULT_FORM_INPUT_HEIGHT = 38;

export const fontSizeMap = {
  "xx-small": 9,
  "x-small": 10,
  small: 13,
  normal: 14,
  medium: 16,
  large: 18,
  "x-large": 24,
  "xx-large": 32,
  smaller: 12,
  larger: 19,
} as const;

type Size = keyof typeof fontSizeMap;

function getFontSize(fontSize: Size | number): number {
  if (typeof fontSize === "number") return fontSize;
  return fontSizeMap[fontSize as Size] ?? 14;
}

export const fontWeightMap = {
  lighter: 100,
  thin: 100,
  extraLight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
  extraBold: 800,
  bolder: 800,
  black: 900,
} as const;

type Weight = keyof typeof fontWeightMap;

function getFontWeight(fontWeight: Weight | string | number): number {
  if (typeof fontWeight === "number") return fontWeight;
  return (fontWeightMap[fontWeight as unknown as Weight] as number) ?? 400;
}

function getFontFamily(
  fontWeight: number,
  fontStyle: "normal" | "italic",
  fontName = "Lato"
) {
  let fontSet = fontStyle === "italic" ? "Italic" : "Regular";
  const addItalic = (set: string) =>
    `${set}${fontStyle === "italic" ? "Italic" : ""}`;
  if (fontWeight <= 100) fontSet = addItalic("Thin");
  else if (fontWeight <= 300) fontSet = addItalic("Light");
  else if (fontWeight >= 900) fontSet = addItalic("Black");
  else if (fontWeight >= 700) fontSet = addItalic("Bold");
  return `${fontName}-${fontSet}`;
}

export type FontSizeProp = keyof typeof fontSizeMap | number;
export type FontWeightProp = keyof typeof fontWeightMap | number;
export type TextColorProp = keyof GridTheme | string;

export type NormalTextProps = {
  activeColor?: TextColorProp;
  disabledColor?: TextColorProp;
  disabled?: boolean;
  fontSize?: FontSizeProp;
  fontStyle?: "normal" | "italic";
  fontWeight?: FontWeightProp;
  style?: StyleProp<TextStyle>;
};

const defaultNormalColor = "cellTextColor";
const defaultDisabledColor = "mutedTextColor";

const getFontColorBase = (
  theme: GridTheme,
  colorKey: TextColorProp,
  defaultKey: TextColorProp
): string => {
  if (!colorKey) return getFontColorBase(theme, defaultKey, defaultNormalColor);
  return (theme[colorKey as unknown as keyof GridTheme] as string) ?? colorKey;
};

const getFontColor = ({
  theme,
  disabled = false,
  activeColor = defaultNormalColor,
  disabledColor = defaultDisabledColor,
}: {
  theme: GridTheme;
  disabled?: boolean;
  activeColor?: TextColorProp;
  disabledColor?: TextColorProp;
}) => {
  return disabled
    ? getFontColorBase(theme, disabledColor, defaultDisabledColor)
    : getFontColorBase(theme, activeColor, defaultNormalColor);
};

export const NormalText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function NormalText(
  {
    fontSize = "normal",
    fontWeight = "normal",
    fontStyle = "normal",
    activeColor,
    disabledColor,
    disabled,
    style,
    ...rest
  },
  ref
) {
  const theme = useGridTheme();
  const numFontWeight = getFontWeight(fontWeight);
  const color = getFontColor({ theme, disabled, activeColor, disabledColor });
  const fontFamily = getFontFamily(numFontWeight, fontStyle);
  const fontSizeNum = getFontSize(fontSize as Size | number);

  const textStyle = React.useMemo(
    () => createNormalTextStyle(fontSizeNum, fontFamily, numFontWeight, fontStyle, color),
    [fontSizeNum, fontFamily, numFontWeight, fontStyle, color]
  );

  return (
    <Text
      ref={ref}
      fsClass={"fs-unmask" as any}
      style={[textStyle.root, style]}
      {...rest}
    />
  );
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const BoldText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function BoldText(props, ref) {
  return <NormalText ref={ref} fontWeight="bold" {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const MutedText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function MutedText(props, ref) {
  return <NormalText ref={ref} activeColor={defaultDisabledColor} {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

type NormalFontAwesomeIconExtraProps = {
  disabled?: boolean;
  activeColor?: keyof GridTheme | string;
  disabledColor?: keyof GridTheme | string;
};

export type NormalFontAwesomeIconProps = FontAwesomeIconProps &
  NormalFontAwesomeIconExtraProps;

export const NormalFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function NormalFontAwesomeIcon(
  { disabled, activeColor, disabledColor, ...rest },
  ref
) {
  const theme = useGridTheme();
  const color = getFontColor({ theme, disabled, activeColor, disabledColor });
  return <FontAwesomeIcon ref={ref} color={color} {...rest} />;
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export const MutedFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function MutedFontAwesomeIcon(props, ref) {
  return (
    <NormalFontAwesomeIcon ref={ref} activeColor={defaultDisabledColor} {...props} />
  );
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export const SuccessText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function SuccessText(props, ref) {
  return <NormalText ref={ref} activeColor="accentColor" {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const SuccessFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function SuccessFontAwesomeIcon(props, ref) {
  return <NormalFontAwesomeIcon ref={ref} activeColor="accentColor" {...props} />;
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export const WarningText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function WarningText(props, ref) {
  return <NormalText ref={ref} activeColor="accentColor" {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const WarningFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function WarningFontAwesomeIcon(props, ref) {
  return <NormalFontAwesomeIcon ref={ref} activeColor="accentColor" {...props} />;
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export const DangerText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function DangerText(props, ref) {
  return <NormalText ref={ref} activeColor="dangerColor" {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const DangerFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function DangerFontAwesomeIcon(props, ref) {
  return <NormalFontAwesomeIcon ref={ref} activeColor="dangerColor" {...props} />;
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export const InfoText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function InfoText(props, ref) {
  return <NormalText ref={ref} activeColor="accentColor" {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const InfoFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function InfoFontAwesomeIcon(props, ref) {
  return <NormalFontAwesomeIcon ref={ref} activeColor="accentColor" {...props} />;
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export const SecondaryText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function SecondaryText(props, ref) {
  return <NormalText ref={ref} activeColor="mutedTextColor" {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const SecondaryFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function SecondaryFontAwesomeIcon(props, ref) {
  return (
    <NormalFontAwesomeIcon ref={ref} activeColor="mutedTextColor" {...props} />
  );
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export function InputWrapper({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[inputWrapperStyles.root, style]}>
      {children}
    </View>
  );
}

export const InputLabelCore = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function InputLabelCore(props, ref) {
  const labelStyle: TextStyle = { lineHeight: 16, textAlign: "left" };
  return (
    <NormalText
      ref={ref}
      fontWeight="medium"
      style={[labelStyle, props.style]}
      {...props}
    />
  );
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const InputLabel = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function InputLabel(props, ref) {
  const labelStyle: TextStyle = { lineHeight: 16, textAlign: "left", marginBottom: 4 };
  return (
    <NormalText
      ref={ref}
      fontWeight="medium"
      style={[labelStyle, props.style]}
      {...props}
    />
  );
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const InputError = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function InputError(props, ref) {
  const errorStyle: TextStyle = { lineHeight: 16, textAlign: "left", flex: 1 };
  return (
    <DangerText
      ref={ref}
      fontWeight="medium"
      style={[errorStyle, props.style]}
      {...props}
    />
  );
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const HeaderText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function HeaderText(props, ref) {
  const headerStyle: TextStyle = {
    marginTop: 5,
    marginBottom: 5,
    paddingHorizontal: 5,
    minHeight: 22,
    lineHeight: 22,
    minWidth: "100%",
    textAlign: "center",
  };
  return <BoldText ref={ref} style={[headerStyle, props.style]} {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const H1 = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function H1(props, ref) {
  return <HeaderText ref={ref} fontSize="large" {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const H2 = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function H2(props, ref) {
  return <HeaderText ref={ref} fontSize="medium" {...props} />;
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export const ButtonText = React.forwardRef<
  React.ElementRef<typeof Text>,
  TextProps & NormalTextProps
>(function ButtonText(props, ref) {
  const buttonTextStyle: TextStyle = { minHeight: 16, lineHeight: 16, textAlign: "center" };
  return (
    <NormalText
      ref={ref}
      fontSize="medium"
      fontWeight={600}
      style={[buttonTextStyle, props.style]}
      {...props}
    />
  );
}) as React.ForwardRefExoticComponent<TextProps & NormalTextProps>;

export { fontSizeMap, fontWeightMap };

export const DefaultText = NormalText;
export const DefaultMutedText = MutedText;

// ─── Styles ────────────────────────────────────────────────────────────────

function createNormalTextStyle(
  fontSizeNum: number,
  fontFamily: string,
  numFontWeight: number,
  fontStyle: "normal" | "italic",
  color: string
) {
  return StyleSheet.create({
    root: {
      fontSize: fontSizeNum,
      fontFamily,
      fontWeight: String(numFontWeight) as TextStyle["fontWeight"],
      fontStyle,
      color,
    },
  });
}

const inputWrapperStyles = StyleSheet.create({
  root: {
    gap: 4,
    flexDirection: "row",
    minHeight: 16,
    width: "100%",
    marginBottom: 4,
  },
});
export const DefaultBoldText = BoldText;
