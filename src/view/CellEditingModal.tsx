import { useRefCallback } from "../internal/hooks";
import { useSlots } from "./slots";
import { BottomActionModal, useCommonStyles } from "./slots/defaults";
// FormPanel is a simple View wrapper in this context
import { View as FormPanel } from "react-native";
import { isEqual } from "lodash";
import * as React from "react";
import { Platform, View, ViewProps } from "react-native";

import { CellEditingStoppedEvent, CellEditorParams } from "../core/types";
import { DefaultInputCellEditor } from "./DefaultInputCellEditor";
import { useGridStyles } from "../themes";

const ANDROID_FOOTER_MARGIN_BOTTOM = { marginBottom: Platform.OS === "android" ? 25 : 0 };

function FooterContainer({ style, children, ...rest }: ViewProps) {
  const { cellEditing } = useGridStyles();
  return (
    <View {...rest} style={[cellEditing.footerBase, ANDROID_FOOTER_MARGIN_BOTTOM, style]}>
      {children}
    </View>
  );
}

export const CellEditingModal: React.FC<{
  isVisible: boolean;
  components?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [p: string]: any;
  };
  params: CellEditorParams;
  onCellEditingStopped?: (event: CellEditingStoppedEvent) => void;
  onCellEditingCancel: () => void;
  isEditable?: boolean | undefined;
  cellTooltipValue?: string | null;
}> = ({
  isVisible,
  components,
  params,
  onCellEditingStopped,
  onCellEditingCancel,
  isEditable,
  cellTooltipValue,
}) => {
  const { Button, FormContainer } = useSlots();
  const cs = useCommonStyles();
  const { value, colDef, node, context, ...rest } = params;
  const [newValue, setNewValue] = React.useState(value);

  const cellEditorParamsRef = React.useRef(colDef.cellEditorParams);

  const CellEditor = React.useMemo(() => {
    if (colDef.cellEditorSelector) {
      const res = colDef.cellEditorSelector(params);
      if (res.params) cellEditorParamsRef.current = res.params;
      return typeof res.component === "string"
        ? components?.[res.component]
        : res.component;
    }
    return components?.[colDef.cellEditor] ?? DefaultInputCellEditor;
  }, [components, colDef.cellEditor, colDef.cellEditorSelector]);

  const CellToolTip = React.useMemo(
    () => components?.[colDef.tooltipRenderer],
    [components, colDef.tooltipRenderer]
  );

  const handleApply = useRefCallback(() => {
    const valueChanged = isEqual(params.value, newValue);
    onCellEditingStopped?.({
      oldValue: params.value,
      rowIndex: node.__index,
      colDef,
      newValue,
      valueChanged,
      node,
      context,
      ...rest,
    });
    onCellEditingCancel();
  }, [params, onCellEditingStopped, newValue]);

  const handleClose = useRefCallback(() => {
    onCellEditingCancel();
  }, [onCellEditingCancel]);

  const handleStopEditing = useRefCallback((cancelEdit = false) => {
    if (cancelEdit) handleClose();
    else handleApply();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleValueChange = useRefCallback((val?: any) => {
    setNewValue(val);
  }, []);

  return (
    <>
      <BottomActionModal
        onClose={handleClose}
        isVisible={isVisible}
        fitContent
        isKeyboard
      >
        {cellTooltipValue && (
          <CellToolTip
            tooltipValue={cellTooltipValue}
            node={node}
            context={context}
          />
        )}
        {isEditable && (
          <>
            <FormPanel style={cs.marginLeftTen}>
              <CellEditor
                {...params}
                value={newValue}
                stopEditing={handleStopEditing}
                onValueChange={handleValueChange}
                colDef={{
                  ...params.colDef,
                  cellEditorParams: cellEditorParamsRef.current,
                }}
              />
            </FormPanel>
            <FooterContainer>
              <FormContainer>
                <Button
                  onClick={handleApply}
                  text="Apply"
                  buttonTheme="primary"
                  containerStyles={[
                    cs.marginRightFive,
                    cs.flexOne,
                  ]}
                ></Button>
              </FormContainer>

              <FormContainer>
                <Button
                  onClick={handleClose}
                  text="Cancel"
                  containerStyles={[cs.flexOne]}
                ></Button>
              </FormContainer>
            </FooterContainer>
          </>
        )}
      </BottomActionModal>
    </>
  );
};
