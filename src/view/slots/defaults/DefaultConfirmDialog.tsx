import * as React from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { BottomActionModal } from "./DefaultBottomSheet";
import { Button } from "./DefaultButton";
import { StyleablePressable } from "./DefaultPressable";
import { ButtonText, H2, NormalText, NormalTextProps } from "./DefaultText";
import { commonStyles } from "./commonStyles";

function ConfirmationText(props: React.ComponentProps<typeof NormalText> & NormalTextProps) {
  const { style, ...rest } = props;
  return (
    <NormalText
      fontSize="medium"
      style={[styles.confirmationText, style]}
      {...rest}
    />
  );
}

export function ConfirmationActions({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.actions, style]}>
      {children}
    </View>
  );
}

function Title(props: React.ComponentProps<typeof H2> & NormalTextProps) {
  const { style, ...rest } = props;
  return <H2 style={[styles.title, style]} {...rest} />;
}

function TopActionsContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.topActions, style]}>
      {children}
    </View>
  );
}

export type ConfirmationModalProps = {
  open: boolean;
  title?: string;
  onSubmit?: VoidFunction;
  onCancel?: VoidFunction;
  allowDismissal?: boolean;
  submitButtonText?: string;
  cancelButtonText?: string;
  swipeToSubmit?: boolean;
};

export const ConfirmationModal: React.FC<
  React.PropsWithChildren<ConfirmationModalProps>
> = ({
  open,
  title,
  onSubmit = () => {},
  onCancel = () => {},
  children,
  submitButtonText = "Confirm",
  cancelButtonText = "Cancel",
  swipeToSubmit = false,
}) => (
  <BottomActionModal
    isVisible={open}
    onClose={onCancel}
    containerStyle={commonStyles.paddingHorizontalFive}
    fitContent
  >
    {swipeToSubmit && (
      <TopActionsContainer>
        <StyleablePressable
          onPress={onCancel}
          containerStyles={styles.cancelPressableContainer}
        >
          <ButtonText activeColor="accentColor">{cancelButtonText}</ButtonText>
        </StyleablePressable>
      </TopActionsContainer>
    )}
    {title ? <Title numberOfLines={1}>{title}</Title> : null}
    <ConfirmationText>{children}</ConfirmationText>
    <ConfirmationActions>
      {swipeToSubmit ? null : (
        <>
          <Button
            buttonTheme="primary"
            onClick={onSubmit}
            containerStyles={[
              commonStyles.marginRightFive,
              commonStyles.flexOne,
            ]}
            text={submitButtonText}
          />
          <Button
            buttonTheme="secondary"
            onClick={onCancel}
            containerStyles={commonStyles.flexOne}
            text={cancelButtonText}
          />
        </>
      )}
    </ConfirmationActions>
  </BottomActionModal>
);

export const DefaultConfirmDialog = ConfirmationModal;

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  confirmationText:          { padding: 15, textAlign: "center" },
  actions:                   { flexDirection: "row", justifyContent: "center", width: "100%" },
  title:                     { marginBottom: -2 },
  topActions:                { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", width: "100%", paddingRight: 20 },
  cancelPressableContainer:  { width: "auto", maxHeight: 10 },
});
