/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import type {
  PressableProps,
  ScrollViewProps,
  TextInputProps as RNTextInputProps,
  TextProps,
  ViewProps,
} from "react-native";

export type ButtonSlotProps = PressableProps & {
  text?: string;
  disabled?: boolean;
  busy?: boolean;
  buttonTheme?: string;
  children?: React.ReactNode;
  width?: number | string;
  height?: number;
  disabledBgColor?: string;
};

export type TextSlotProps = TextProps & {
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  color?: string;
  disabled?: boolean;
  muted?: boolean;
  children?: React.ReactNode;
};

export type TextInputSlotProps = RNTextInputProps & {
  name?: string;
  errors?: any;
  clearable?: boolean;
  displayMode?: boolean;
  rows?: number;
  disabled?: boolean;
  iconRight?: any;
  rightContent?: React.ReactNode;
};

export type CheckboxSlotProps = {
  checked: boolean | null;
  label?: string;
  labelPlacement?: "left" | "right";
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
};

export type PressableSlotProps = PressableProps & {
  disabled?: boolean;
  height?: number;
  children?: React.ReactNode;
};

export type TopBarSlotProps = ViewProps & {
  title?: string | React.ReactNode;
  onBackClick?: () => void;
  onMenuClick?: () => void;
  LeftActions?: React.ReactNode;
  RightActions?: React.ReactNode;
  noBorder?: boolean;
  safe?: boolean;
  children?: React.ReactNode;
};

export type FormContainerSlotProps = {
  children?: React.ReactNode;
};

export type BottomSheetSlotProps = {
  isVisible: boolean;
  onClose?: () => void;
  snapPoints?: (string | number)[];
  closeable?: boolean;
  closeOnClickOutside?: boolean;
  showBackdrop?: boolean;
  fitContent?: boolean;
  disableHandle?: boolean;
  children?: React.ReactNode;
};

export type ConfirmDialogSlotProps = {
  open: boolean;
  title?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitButtonText?: string;
  cancelButtonText?: string;
  children?: React.ReactNode;
};

export type AccordionSlotProps = {
  title?: string;
  defaultOpen?: boolean;
  open?: boolean;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  keepRendered?: boolean;
  animate?: boolean;
  onOpenStateChange?: (open: boolean) => void;
  children?: React.ReactNode;
  elevate?: boolean;
};

export type IconSlotProps = {
  icon?: any;
  size?: number;
  color?: string;
  disabled?: boolean;
  activeColor?: string;
  disabledColor?: string;
};

export type ActionButtonSlotProps = PressableProps & {
  text?: string;
  icon?: any;
  disabled?: boolean;
  disabledBgColor?: string;
  children?: React.ReactNode;
};

export type DividerSlotProps = ViewProps;

export type GridSlots = {
  Button: React.ComponentType<ButtonSlotProps>;
  Text: React.ComponentType<TextSlotProps>;
  MutedText: React.ComponentType<TextSlotProps>;
  TextInput: React.ComponentType<TextInputSlotProps>;
  Checkbox: React.ComponentType<CheckboxSlotProps>;
  Pressable: React.ComponentType<PressableSlotProps>;
  TopBar: React.ComponentType<TopBarSlotProps>;
  FormContainer: React.ComponentType<FormContainerSlotProps>;
  BottomSheet: React.ComponentType<BottomSheetSlotProps>;
  ConfirmationDialog: React.ComponentType<ConfirmDialogSlotProps>;
  Accordion: React.ComponentType<AccordionSlotProps>;
  Icon: React.ComponentType<IconSlotProps>;
  ActionButton: React.ComponentType<ActionButtonSlotProps>;
  FlexView: React.ComponentType<ViewProps>;
  FullView: React.ComponentType<ViewProps>;
  ScrollView: React.ComponentType<ScrollViewProps>;
  Divider: React.ComponentType<DividerSlotProps>;
};
