import { useRefCallback } from "../../../internal/hooks";
import {
  faCheckSquare,
  faMinusSquare,
  faSquare,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIconStyle } from "@fortawesome/react-native-fontawesome";
import * as React from "react";
import { StyleProp, TextStyle, View, ViewProps, ViewStyle } from "react-native";

import { useGridStyles } from "../../../themes";
import { Button } from "./DefaultButton";
import { NormalFontAwesomeIcon, NormalText, NormalTextProps } from "./DefaultText";

export type Placement = "left" | "right";

type CheckboxContainerProps = ViewProps & { labelPlacement?: Placement };

function CheckboxContainer({ labelPlacement, style, children, ...rest }: CheckboxContainerProps) {
  const { checkbox } = useGridStyles();
  const containerStyle = labelPlacement === "right" ? checkbox.containerRight : checkbox.containerLeft;
  return (
    <View {...rest} style={[containerStyle, style]}>
      {children}
    </View>
  );
}

function StyledLabel(props: React.ComponentProps<typeof NormalText> & NormalTextProps) {
  const { style, ...rest } = props;

  return (
    <NormalText
      style={[{ marginLeft: 8, marginRight: 8, flexShrink: 1 }, style]}
      {...rest}
    />
  );
}

export type CheckboxProps = {
  label?: string;
  checked: boolean | null;
  required?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  labelPlacement?: Placement;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  pressedStyles?: StyleProp<ViewStyle>;
  height?: number;
  containerStyles?: StyleProp<ViewStyle>;
};

export const CheckSquare: React.FC<{
  checked: boolean | null;
  disabled?: boolean;
  style?: FontAwesomeIconStyle;
}> = ({ checked, disabled, style }) => {
  const icon =
    checked === null ? faMinusSquare : checked ? faCheckSquare : faSquare;

  return (
    <NormalFontAwesomeIcon style={style} disabled={disabled} icon={icon} />
  );
};

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  labelPlacement = "left",
  style,
  labelStyle,
  pressedStyles,
  height,
  containerStyles,
}) => {
  const handleChange = useRefCallback(() => {
    if (disabled) return;

    if (checked === false || checked === undefined) {
      onChange?.(true);
    } else if (checked === true || checked === null) {
      onChange?.(false);
    }
  }, [onChange, checked, disabled]);

  return (
    <Button
      style={style}
      pressedStyles={pressedStyles as ViewStyle}
      onClick={handleChange}
      disabled={disabled}
      height={height}
      containerStyles={containerStyles}
    >
      <CheckboxContainer labelPlacement={labelPlacement}>
        {labelPlacement === "left" && (
          <CheckSquare
            checked={checked}
            disabled={disabled}
            style={labelStyle as unknown as FontAwesomeIconStyle}
          />
        )}
        <StyledLabel style={labelStyle} disabled={disabled} numberOfLines={1}>
          {label ? label : <>&nbsp;</>}
        </StyledLabel>
        {labelPlacement === "right" && (
          <CheckSquare
            checked={checked}
            disabled={disabled}
            style={labelStyle as unknown as FontAwesomeIconStyle}
          />
        )}
      </CheckboxContainer>
    </Button>
  );
};

export const DefaultCheckbox = Checkbox;
