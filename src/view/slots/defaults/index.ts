import type { GridSlots } from "../types";
import { DefaultAccordion } from "./DefaultAccordion";
import { DefaultActionButton } from "./DefaultActionButton";
import { DefaultBottomSheet } from "./DefaultBottomSheet";
import { DefaultButton } from "./DefaultButton";
import { DefaultCheckbox } from "./DefaultCheckbox";
import { DefaultConfirmDialog } from "./DefaultConfirmDialog";
import { DefaultFormContainer } from "./DefaultFormContainer";
import { DefaultIcon } from "./DefaultIcon";
import { Divider, FlexGrowContentScrollView, FlexView, FullView } from "./DefaultLayout";
import { DefaultPressable } from "./DefaultPressable";
import { DefaultMutedText, DefaultText } from "./DefaultText";
import { DefaultTextInput } from "./DefaultTextInput";
import { DefaultTopBar } from "./DefaultTopBar";

export const DEFAULT_SLOTS: GridSlots = {
  Button: DefaultButton,
  Text: DefaultText,
  MutedText: DefaultMutedText,
  TextInput: DefaultTextInput,
  Checkbox: DefaultCheckbox,
  Pressable: DefaultPressable,
  TopBar: DefaultTopBar,
  FormContainer: DefaultFormContainer,
  BottomSheet: DefaultBottomSheet,
  ConfirmationDialog: DefaultConfirmDialog,
  Accordion: DefaultAccordion,
  Icon: DefaultIcon,
  ActionButton: DefaultActionButton,
  FlexView,
  FullView,
  ScrollView: FlexGrowContentScrollView,
  Divider,
};

// --- Accordion ---
export { DefaultAccordion, Accordion, AccentBarAccordion } from "./DefaultAccordion";
export type { ContentComponent } from "./DefaultAccordion";

// --- ActionButton ---
export { DefaultActionButton, QuickActionButton } from "./DefaultActionButton";

// --- BottomSheet ---
export {
  DefaultBottomSheet,
  BottomActionModal,
  BottomActionModalContext,
  useIsInBottomActionModal,
  BottomSheetHandle,
  processPercent,
} from "./DefaultBottomSheet";

// --- Button ---
export { DefaultButton, Button } from "./DefaultButton";
export type { ButtonProps } from "./DefaultButton";

// --- Checkbox ---
export { DefaultCheckbox, Checkbox, CheckSquare } from "./DefaultCheckbox";
export type { CheckboxProps, Placement } from "./DefaultCheckbox";

// --- ConfirmDialog ---
export {
  DefaultConfirmDialog,
  ConfirmationModal,
  ConfirmationActions,
} from "./DefaultConfirmDialog";
export type { ConfirmationModalProps } from "./DefaultConfirmDialog";

// --- FormContainer ---
export {
  DefaultFormContainer,
  FormElementContainer,
  FormElement,
  FormElementLabel,
  FormElementPropList,
  FormLabeledValueColumn,
  FormPanel,
  Panel,
  PanelColumn,
  PanelRow,
  PanelTitle,
  SingleElementPanelRow,
  SingleRowFormPanel,
  SingleItemFormPanel,
  Value,
} from "./DefaultFormContainer";
export type { FormElementLabelProps, FormElementProps } from "./DefaultFormContainer";

// --- Icon ---
export { DefaultIcon } from "./DefaultIcon";

// --- Layout ---
export {
  Divider,
  FlexGrowContentScrollView,
  FlexView,
  FullView,
  FlexGrowView,
  SafeContentContainer,
  CenterContent,
  HR,
} from "./DefaultLayout";

// --- Pressable ---
export {
  DefaultPressable,
  StyleablePressable,
  StyleablePressableBase,
  StyleablePressableThemed,
} from "./DefaultPressable";
export type { StyleablePressableBaseProps, StyleablePressableProps } from "./DefaultPressable";

// --- Text ---
export {
  DefaultText,
  DefaultMutedText,
  DefaultBoldText,
  NormalText,
  BoldText,
  MutedText,
  NormalFontAwesomeIcon,
  SuccessText,
  WarningText,
  DangerText,
  InfoText,
  SecondaryText,
  InputWrapper,
  InputLabelCore,
  InputLabel,
  InputError,
  HeaderText,
  H1,
  H2,
  ButtonText,
  DEFAULT_FORM_INPUT_HEIGHT,
  fontSizeMap,
  fontWeightMap,
} from "./DefaultText";
export type { NormalTextProps, FontSizeProp, FontWeightProp, TextColorProp } from "./DefaultText";

// --- TextInput ---
export { DefaultTextInput, TextInput } from "./DefaultTextInput";
export type { TextInputProps } from "./DefaultTextInput";

// --- TopBar ---
export { DefaultTopBar, TopBar, TopBarContainer, TopBarActionButton } from "./DefaultTopBar";

// --- commonStyles ---
export { commonStyles, useCommonStyles } from "./commonStyles";
export type { CommonStyles } from "./commonStyles";

// --- ErrorBoundary ---
export { ErrorBoundary } from "./ErrorBoundary";

// Backward-compatible aliases
export { ConfirmationModal as ConfirmDialog } from "./DefaultConfirmDialog";
export { HR as HorizontalRule } from "./DefaultLayout";
