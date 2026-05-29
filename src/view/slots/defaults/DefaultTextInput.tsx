/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import { useRefCallback } from "../../../internal/hooks";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import emojiRegex from "emoji-regex";
import { noop } from "lodash";
import * as React from "react";
import { FieldErrors } from "react-hook-form";
import {
  NativeSyntheticEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextInput as ReactTextInput,
  TextInputChangeEventData,
  TextInputFocusEventData,
  TextInputProps as RNTextInputProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";

import { useGridTheme, useGridStyles, useTokens } from "../../../themes";
import { useIsInBottomActionModal } from "./DefaultBottomSheet";
import { Button, ButtonProps } from "./DefaultButton";
import { FlexGrowView } from "./DefaultLayout";
import { StyleablePressable } from "./DefaultPressable";
import { NormalFontAwesomeIcon } from "./DefaultText";

// --- TextInputStyled ---

type TextInputStyledProps = RNTextInputProps & { disabled?: boolean; hasError?: boolean };

const TextInputStyled = React.forwardRef<ReactTextInput, TextInputStyledProps>(
  function TextInputStyled({ disabled, hasError: _hasError, style, ...rest }, ref) {
    const { textInput } = useGridStyles();
    return (
      <ReactTextInput
        ref={ref}
        style={[textInput.fieldBase, disabled ? textInput.fieldDisabled : textInput.fieldEnabled, style]}
        {...rest}
      />
    );
  }
);

// --- DisplayInput (non-editable clickable display) ---

const DisplayInput = React.forwardRef<unknown, RNTextInputProps>(
  ({ value, onFocus, ...props }, ref) => {
    return (
      <FlexGrowView>
        <StyleablePressable onPress={onFocus as VoidFunction}>
          <Text ref={ref} {...(props as any)}>
            {value}
          </Text>
        </StyleablePressable>
      </FlexGrowView>
    );
  }
);

type DisplayInputStyledProps = RNTextInputProps & { disabled?: boolean; hasError?: boolean };

const DisplayInputStyled = React.forwardRef<unknown, DisplayInputStyledProps>(
  function DisplayInputStyled({ disabled, hasError: _hasError, style, ...rest }, ref) {
    const { textInput } = useGridStyles();
    return (
      <DisplayInput
        ref={ref}
        style={[textInput.fieldBase, disabled ? textInput.fieldDisabled : textInput.fieldEnabled, style]}
        {...rest}
      />
    );
  }
);

// --- BottomSheetTextInputStyled ---

type BottomSheetInputStyledProps = RNTextInputProps & { disabled?: boolean; hasError?: boolean };

const BottomSheetTextInputStyled = React.forwardRef<ReactTextInput, BottomSheetInputStyledProps>(
  function BottomSheetTextInputStyled({ disabled, hasError: _hasError, style, ...rest }, ref) {
    const { textInput } = useGridStyles();
    return (
      <BottomSheetTextInput
        ref={ref}
        style={[textInput.fieldBase, disabled ? textInput.fieldDisabled : textInput.fieldEnabled, style]}
        {...rest}
      />
    );
  }
);

// --- TextInputContainer ---

type TextInputContainerProps = ViewProps & {
  disabled?: boolean;
  focused?: boolean;
  hasError?: boolean;
};

function TextInputContainer({ focused, hasError, style, children, ...rest }: TextInputContainerProps) {
  const { textInput } = useGridStyles();
  const borderVariant = hasError
    ? textInput.borderError
    : focused
    ? textInput.borderFocused
    : textInput.borderDefault;
  return (
    <View {...rest} style={[textInput.container, borderVariant, style]}>
      {children}
    </View>
  );
}

// --- Simple layout helpers ---

function RightContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.rightContainer, style]}>
      {children}
    </View>
  );
}

function RightIconContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.rightIconContainer, style]}>
      {children}
    </View>
  );
}

function RightContent({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.rightContent, style]}>
      {children}
    </View>
  );
}

// --- StyledButton ---

const StyledButton = React.forwardRef<View, ButtonProps>(function StyledButton(props, ref) {
  const t = useTokens();
  return (
    <Button ref={ref} height={t.buttonSm} buttonTheme="basic" disabledBgColor="transparent" {...props} />
  );
});

// --- Public API ---

export type TextInputProps = RNTextInputProps & {
  name?: string;
  label?: string | React.ReactNode;
  errors?: FieldErrors;
  focused?: boolean;
  iconRight?: IconDefinition;
  rightContent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  rows?: number;
  disabled?: boolean;
  displayMode?: boolean;
  clearable?: boolean;
  onClearValue?: VoidFunction;
  focusOnClear?: boolean;
  onPressIn?: VoidFunction;
  onDisabledPress?: VoidFunction;
  placeholderTextColor?: string;
  onRightIconClick?: VoidFunction;
};

export const TextInput = React.forwardRef<ReactTextInput, TextInputProps>(
  function TextInput(props, ref) {
    const {
      name,
      errors,
      onBlur,
      onFocus,
      iconRight,
      style,
      inputStyle,
      focusedStyle,
      rows = 1,
      disabled,
      onChangeText,
      clearable,
      rightContent,
      onClearValue,
      focusOnClear = false,
      focused: focusedOverride = false,
      autoFocus = false,
      onDisabledPress,
      onPressIn,
      placeholderTextColor,
      onRightIconClick,
      displayMode = false,
      ...restProps
    } = props;

    const t = useTokens();
    const theme = useGridTheme();
    const isInBottomActionModal = useIsInBottomActionModal();
    const [focused, setFocused] = React.useState(focusedOverride);
    const inputRef = React.useRef<ReactTextInput | null>(null);

    const hasError = errors && name && errors[name];

    React.useEffect(() => {
      let timer: number;
      if (autoFocus) {
        if (isInBottomActionModal === false) {
          inputRef.current?.blur();
          setFocused(false);
          return;
        }

        timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 50) as unknown as number;
      }
      return () => {
        clearTimeout(timer);
      };
    }, [autoFocus, isInBottomActionModal]);

    const handleFocus = useRefCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (!disabled) {
          setFocused(true);
          onFocus?.(e);
        }
      },
      [disabled, onFocus]
    );

    const handleBlur = useRefCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (!disabled) {
          setFocused(false);
          onBlur?.(e);
        }
      },
      [disabled, onBlur]
    );

    const handlePressIn = useRefCallback(() => {
      if (!disabled) {
        onPressIn?.();
      } else {
        onDisabledPress?.();
      }
    }, [disabled, onPressIn, onDisabledPress]);

    const handleClear = useRefCallback(() => {
      if (onClearValue) {
        inputRef.current?.blur();
        onClearValue?.();
      } else if (focusOnClear) {
        inputRef.current?.focus();
      }
    }, [onClearValue, focusOnClear]);

    const handleChangeText = useRefCallback(
      (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
        if (!disabled) {
          let value: any = e;
          const regex = emojiRegex();

          // eslint-disable-next-line no-restricted-syntax
          for (const match of value.matchAll(regex)) {
            const emoji = match[0];
            value = value.replaceAll(emoji, "");
          }
          onChangeText?.(value);
        }
      },
      [disabled, onChangeText]
    );

    const handleSetRef = React.useCallback(
      (refObj: ReactTextInput) => {
        inputRef.current = refObj;
        if (typeof ref === "function") {
          ref(refObj);
        } else if (ref) {
          // eslint-disable-next-line no-param-reassign
          ref.current = refObj;
        }
      },
      [inputRef, ref]
    );

    const handleRightIconClick = React.useCallback(() => {
      onRightIconClick?.();
    }, [onRightIconClick]);

    // Multi-line height: rows * lineHeightHeader + inputPadding * 2
    const height = rows * t.lineHeightHeader + t.inputPadding * 2;

    const commonProps: RNTextInputProps = React.useMemo(
      () => ({
        autoCorrect: false,
        multiline: rows > 1,
        keyboardAppearance: "dark",
        disabled: disabled,
        editable: !disabled,
        placeholderTextColor: placeholderTextColor ?? theme.mutedTextColor,
        onBlur: handleBlur,
        onFocus: handleFocus,
        onPressIn: handlePressIn,
        onChangeText: disabled ? noop : handleChangeText,
        pointerEvents: !onDisabledPress && disabled ? "none" : "auto",
        style: [inputStyle, { height, textAlignVertical: "top" }],
      }),
      [
        rows,
        disabled,
        placeholderTextColor,
        theme,
        inputStyle,
        height,
        onDisabledPress,
        handleBlur,
        handleFocus,
        handlePressIn,
        handleChangeText,
      ]
    );

    return (
      <TextInputContainer
        focused={focused || focusedOverride}
        disabled={disabled}
        hasError={!!hasError}
        style={[
          style as any,
          { height },
          focused || focusedOverride ? focusedStyle : {},
        ]}
      >
        {displayMode ? (
          <DisplayInputStyled
            {...commonProps}
            {...restProps}
            ref={(ref) => handleSetRef(ref as ReactTextInput)}
          />
        ) : isInBottomActionModal ? (
          <BottomSheetTextInputStyled
            {...commonProps}
            {...restProps}
            ref={(ref) => handleSetRef(ref as ReactTextInput)}
          />
        ) : (
          <TextInputStyled {...commonProps} {...restProps} ref={handleSetRef} />
        )}
        <RightContainer>
          {clearable && (
            <RightIconContainer>
              <StyledButton onClick={handleClear} disabled={disabled}>
                <NormalFontAwesomeIcon
                  disabled={disabled}
                  icon={faTimes as unknown as any}
                  size={16}
                />
              </StyledButton>
            </RightIconContainer>
          )}
          {rightContent && <RightContent>{rightContent}</RightContent>}
          {iconRight && (
            <RightIconContainer>
              <StyledButton onClick={handleRightIconClick} disabled={disabled}>
                <NormalFontAwesomeIcon
                  disabled={disabled}
                  icon={iconRight}
                  size={16}
                />
              </StyledButton>
            </RightIconContainer>
          )}
        </RightContainer>
      </TextInputContainer>
    );
  }
);

export const DefaultTextInput = TextInput;

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  rightContainer:     { flexDirection: "row" },
  rightIconContainer: { width: 30 },
  rightContent:       { minWidth: 30, justifyContent: "center", alignItems: "center" },
});
