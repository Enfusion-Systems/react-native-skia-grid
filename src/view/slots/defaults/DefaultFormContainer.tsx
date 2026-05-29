/* eslint-disable no-nested-ternary */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useDeepEqMemo, useModalState } from "../../../internal/hooks";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { ErrorMessage as EM } from "@hookform/error-message";
import * as React from "react";
import { UseFormMethods } from "react-hook-form";
import {
  DimensionValue,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";

import { BottomActionModal, BottomSheetHandle } from "./DefaultBottomSheet";
import {
  StyleablePressable,
  StyleablePressableBase,
  StyleablePressableBaseProps,
} from "./DefaultPressable";
import {
  BoldText,
  H2,
  InfoFontAwesomeIcon,
  InputError,
  InputLabelCore,
  InputWrapper,
  NormalText,
  NormalTextProps,
} from "./DefaultText";
import { FlexGrowContentScrollView } from "./DefaultLayout";

type FormLayout = "mobile" | "tablet";

// --- FormLabeledValueColumnContainer ---

function FormLabeledValueColumnContainer({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.labeledValueRow, style]}>
      {children}
    </View>
  );
}

export const FormLabeledValueColumn: React.FC<
  React.PropsWithChildren<{ label: string }>
> = ({ label, children }) => (
  <FormLabeledValueColumnContainer>
    <BoldText numberOfLines={1} style={{ flex: 1 }}>
      {label}
    </BoldText>
    <Value numberOfLines={1}>{children}</Value>
  </FormLabeledValueColumnContainer>
);

const FormElementContainerBase = React.forwardRef<
  View,
  StyleablePressableBaseProps & {
    contentStyle?: StyleProp<ViewStyle>;
    bottomJustify?: boolean;
  }
>(function FormElementContainerBase(
  { style, children, contentStyle, baseStyle, bottomJustify = false, ...rest },
  ref
) {
  return (
    <StyleablePressableBase
      baseStyle={[
        { justifyContent: bottomJustify ? "flex-end" : "flex-start" },
        baseStyle,
      ]}
      containerStyles={style}
      allowPointerEvents
      style={contentStyle}
      {...rest}
      ref={ref}
    >
      {children}
    </StyleablePressableBase>
  );
});

// --- FormElementContainer (Pattern C) ---

type FormElementContainerProps = React.ComponentProps<typeof FormElementContainerBase> & {
  formLayout?: FormLayout;
  mobileBasis?: string;
  tabletBasis?: string;
};

export const FormElementContainer = React.forwardRef<View, FormElementContainerProps>(
  function FormElementContainer(
    { formLayout = "mobile", mobileBasis, tabletBasis, style, ...rest },
    ref
  ) {
    const flexBasisStyle: ViewStyle =
      formLayout === "mobile" && mobileBasis
        ? { flexBasis: mobileBasis as any, maxWidth: mobileBasis as any }
        : formLayout === "tablet" && tabletBasis
        ? { flexBasis: tabletBasis as any }
        : {};

    return (
      <FormElementContainerBase
        ref={ref}
        style={[styles.formElementContainer, flexBasisStyle, style as ViewStyle]}
        {...rest}
      />
    );
  }
);

// --- FormLabeledValueContainer ---

type FormLabeledValueContainerProps = ViewProps & { orientation?: string };

function FormLabeledValueContainer({
  orientation = "column",
  style,
  children,
  ...rest
}: FormLabeledValueContainerProps) {
  const orientationStyle: ViewStyle =
    orientation === "column"
      ? { justifyContent: "space-between", flexDirection: "row" }
      : { flexDirection: "column" };

  return (
    <View
      {...rest}
      style={[styles.labeledValueCenter, orientationStyle, style]}
    >
      {children}
    </View>
  );
}

export type FormElementLabelProps = {
  label?: React.ReactNode;
  name?: string;
  errors?: UseFormMethods<any>["errors"];
  required?: boolean;
  labelColor?: string;
  infoContent?: React.ReactNode;
  showIcons?: boolean;
};

export type FormElementProps = Omit<
  StyleablePressableBaseProps,
  "baseStyle" | "baseContainerStyles"
> &
  FormElementLabelProps & {
    mobileBasis?: string;
    tabletBasis?: string;
    bottomJustify?: boolean;
  };

export const FormElementPropList = [
  "label",
  "name",
  "required",
  "labelColor",
  "infoContent",
  "showIcons",
  "mobileBasis",
  "tabletBasis",
  "bottomJustify",
] as const;

export const FormElementLabel: React.FC<FormElementLabelProps> = (props) => {
  const {
    label,
    name,
    errors,
    required,
    labelColor,
    infoContent,
    showIcons = true,
  } = props;
  const detailsModalState = useModalState();

  const hasError = useDeepEqMemo(
    () => {
      return !!name && !!errors && !!errors[name];
    },
    [],
    [name, errors]
  );

  let labelContent: any = null;
  if (!!label) {
    labelContent = (
      <InputWrapper>
        <InputLabelCore numberOfLines={1} activeColor={labelColor}>
          {label}
        </InputLabelCore>
        {required ? <BoldText activeColor="accentColor">*</BoldText> : null}
        {showIcons && !!infoContent ? (
          <StyleablePressable
            style={{ marginTop: 2 }}
            containerStyles={{ width: 16, maxWidth: 16, height: 16 }}
            onPress={detailsModalState.openModal}
          >
            <InfoFontAwesomeIcon size={14} icon={faInfoCircle} />
          </StyleablePressable>
        ) : null}
        {showIcons && hasError && !!name ? (
          <StyleablePressable
            containerStyles={{
              display: "flex",
              alignItems: "flex-start",
              width: undefined,
              flex: 1,
              marginTop: 2,
            }}
            height={16}
            onPress={detailsModalState.openModal}
          >
            <EM
              errors={errors}
              name={name}
              render={(props) => {
                if (props.messages)
                  return (
                    <InputError numberOfLines={1}>
                      {props.messages[0]}
                    </InputError>
                  );
                return (
                  <InputError numberOfLines={1}>{props.message}</InputError>
                );
              }}
            />
          </StyleablePressable>
        ) : null}
      </InputWrapper>
    );
  }

  return (
    <>
      {labelContent}
      {showIcons && !!label && (hasError || !!infoContent) && (
        <BottomActionModal
          isVisible={detailsModalState.open}
          onClose={detailsModalState.closeModal}
          snapPoints={["10%", "50%", "100%"]}
          showBackdrop
          closeOnClickOutside
          disableHandle
        >
          <BottomSheetHandle
            label={label}
            onDone={detailsModalState.closeModal}
          />
          <FlexGrowContentScrollView
            contentContainerStyle={{ paddingHorizontal: 5 }}
          >
            {!!infoContent ? (
              typeof infoContent === "string" ? (
                <NormalText>{infoContent}</NormalText>
              ) : (
                infoContent
              )
            ) : null}
            {hasError && !!name ? (
              <EM
                errors={errors}
                name={name}
                render={(props) => {
                  if (props.messages)
                    return Object.entries(props.messages).map(
                      ([type, message]) => (
                        <InputError key={type}>{message}</InputError>
                      )
                    );
                  return <InputError>{props.message}</InputError>;
                }}
              />
            ) : null}
          </FlexGrowContentScrollView>
        </BottomActionModal>
      )}
    </>
  );
};

export const FormElement: React.FC<
  React.PropsWithChildren<FormElementProps>
> = ({
  label,
  required = false,
  style,
  children,
  allowPointerEvents = true,
  errors,
  name,
  labelColor,
  infoContent,
  showIcons,
  ...rest
}) => {
  const errorMessageModalState = useModalState();

  const errorMessage =
    errors && name
      ? errors[name]?.message || errors[name]?.type || errors[name]
      : null;

  return (
    <FormElementContainer
      formLayout="mobile"
      contentStyle={style}
      allowPointerEvents={allowPointerEvents}
      baseContainerStyles={{ width: "100%" }}
      baseStyle={{
        width: "100%",
        flexGrow: 1,
        flexShrink: 1,
        flexDirection: "column",
      }}
      {...rest}
    >
      <FormElementLabel
        label={label}
        required={required}
        errors={errors}
        name={name}
        labelColor={labelColor}
        infoContent={infoContent}
        showIcons={showIcons}
      />
      {children}
      <BottomActionModal
        isVisible={errorMessageModalState.open}
        onClose={errorMessageModalState.closeModal}
        snapPoints={120}
        closeOnClickOutside
      >
        <BoldText style={{ padding: 16 }}>{errorMessage}</BoldText>
      </BottomActionModal>
    </FormElementContainer>
  );
};

// --- Value (Pattern D) ---

export function Value({ style, ...props }: React.ComponentProps<typeof NormalText> & NormalTextProps) {
  return <NormalText style={[styles.value, style]} {...props} />;
}

// --- Panel, PanelColumn ---

export function Panel({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.panel, style]}>
      {children}
    </View>
  );
}

export function PanelColumn({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.panel, style]}>
      {children}
    </View>
  );
}

// --- PanelRow ---

export const PanelRow: React.FC<
  React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>
> = ({ children, style }) => {
  return (
    <View style={[styles.panelRow, style as ViewStyle]}>
      {children}
    </View>
  );
};

// --- PanelContent ---

function PanelContent({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.panelContent, style]}>
      {children}
    </View>
  );
}

// --- PanelTitle (Pattern D) ---

export function PanelTitle(props: React.ComponentProps<typeof H2> & NormalTextProps) {
  const { style, ...rest } = props;
  return <H2 style={[styles.panelTitle, style]} {...rest} />;
}

// --- FormPanel ---

export const FormPanel = React.forwardRef<
  View,
  {
    title?: string;
    children: React.ReactNode;
    minHeight?: DimensionValue;
    contentStyles?: ViewStyle;
    style?: StyleProp<ViewStyle>;
  }
>(function FormPanel(
  { title, children, minHeight, contentStyles, style },
  ref
) {
  return (
    <Panel style={[style, { minHeight }]} ref={ref}>
      {title ? <PanelTitle numberOfLines={1}>{title}</PanelTitle> : null}
      <PanelContent style={contentStyles}>{children}</PanelContent>
    </Panel>
  );
});

export const SingleElementPanelRow: React.FC<
  React.PropsWithChildren<FormElementProps>
> = ({ children, ...rest }) => (
  <PanelRow>
    <FormElement {...rest}>{children}</FormElement>
  </PanelRow>
);

export const SingleRowFormPanel: React.FC<
  React.PropsWithChildren<{ title?: string }>
> = ({ children, ...rest }) => (
  <FormPanel {...rest}>
    <PanelRow>{children}</PanelRow>
  </FormPanel>
);

export const SingleItemFormPanel: React.FC<
  React.PropsWithChildren<{ title?: string }>
> = ({ children, ...rest }) => (
  <SingleRowFormPanel {...rest}>
    <FormElement>{children}</FormElement>
  </SingleRowFormPanel>
);

export const DefaultFormContainer = FormElementContainer;

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  labeledValueRow:      { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  labeledValueCenter:   { justifyContent: "center", alignItems: "center" },
  formElementContainer: { flexGrow: 1, flexShrink: 1, marginRight: 5, marginTop: 5 },
  value:                { flex: 1, overflow: "hidden", textAlign: "left" },
  panel:                { marginHorizontal: 5, flexDirection: "column" },
  panelRow:             { flexDirection: "row", marginTop: 2, flexWrap: "wrap" },
  panelContent:         { flexDirection: "column", marginBottom: 4 },
  panelTitle:           { marginBottom: -2 },
});
