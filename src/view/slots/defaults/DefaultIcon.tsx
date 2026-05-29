/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import {
  FontAwesomeIcon,
  Props as FontAwesomeIconProps,
} from "@fortawesome/react-native-fontawesome";
import * as React from "react";

import type { IconSlotProps } from "../types";
import type { GridTheme } from "../../../themes";
import { useGridTheme, useTokens } from "../../../themes";

type NormalFontAwesomeIconExtraProps = {
  disabled?: boolean;
  activeColor?: keyof GridTheme | string;
  disabledColor?: keyof GridTheme | string;
};

export type NormalFontAwesomeIconProps = FontAwesomeIconProps &
  NormalFontAwesomeIconExtraProps;

const defaultNormalColor = "cellTextColor";
const defaultDisabledColor = "mutedTextColor";

const getFontColorBase = (
  theme: GridTheme,
  colorKey: string | undefined,
  defaultKey: string
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
  activeColor?: string;
  disabledColor?: string;
}) => {
  return disabled
    ? getFontColorBase(theme, disabledColor, defaultDisabledColor)
    : getFontColorBase(theme, activeColor, defaultNormalColor);
};

export const NormalFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function NormalFontAwesomeIcon({ disabled, activeColor, disabledColor, ...rest }, ref) {
  const theme = useGridTheme();
  const color = getFontColor({ theme, disabled, activeColor: activeColor as string, disabledColor: disabledColor as string });
  return <FontAwesomeIcon ref={ref} color={color} {...rest} />;
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export const MutedFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function MutedFontAwesomeIcon(props, ref) {
  return <NormalFontAwesomeIcon ref={ref} activeColor={defaultDisabledColor} {...props} />;
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export const InfoFontAwesomeIcon = React.forwardRef<
  React.ElementRef<typeof FontAwesomeIcon>,
  NormalFontAwesomeIconProps
>(function InfoFontAwesomeIcon(props, ref) {
  return <NormalFontAwesomeIcon ref={ref} activeColor="accentColor" {...props} />;
}) as React.ForwardRefExoticComponent<NormalFontAwesomeIconProps>;

export function DefaultIcon({
  icon,
  size,
  color,
  disabled,
  activeColor,
  disabledColor,
}: IconSlotProps) {
  const t = useTokens();
  const theme = useGridTheme();

  const resolvedSize = size ?? t.iconSize;
  const resolvedColor = disabled
    ? disabledColor ?? theme.mutedTextColor
    : activeColor ?? color ?? theme.cellTextColor;

  if (React.isValidElement(icon)) {
    return icon;
  }

  if (icon == null) {
    return null;
  }

  return (
    <FontAwesomeIcon
      icon={icon}
      size={resolvedSize}
      color={resolvedColor}
    />
  );
}
