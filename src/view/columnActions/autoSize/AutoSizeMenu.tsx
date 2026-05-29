import { useRefCallback } from "../../../internal/hooks";
import { useGridTheme } from "../../../themes";
import React from "react";
import { View } from "react-native";

import type { SkiaInternalGridColumn } from "../../../core/types";
import type { GridContextSnapshot } from "../../context";
import {
  ActionContainer,
  FormButtonContainer,
  StyledButton,
  StyledText,
  StyledTopBar,
} from "../shared/formActionStyles";

export const AutoSizeMenu: React.FC<{
  column: SkiaInternalGridColumn;
  onBackClick: VoidFunction;
  useGridActions: () => GridContextSnapshot;
}> = ({ column, onBackClick, useGridActions }) => {
  const { autoSizeColumns, columns } = useGridActions();
  const theme = useGridTheme();

  const autoResizeAllColumns = useRefCallback(() => {
    const activeColumns = columns?.filter(
      (col) => !col.hide && !col.checkboxSelection
    );
    autoSizeColumns?.(activeColumns);
  }, [columns]);

  const autoResizeColumn = useRefCallback(() => {
    if (column) autoSizeColumns?.([column]);
  }, [column]);

  return (
    <View>
      <StyledTopBar title="Auto size" theme={theme} onBackClick={onBackClick} />
      <ActionContainer>
        <FormButtonContainer>
          <StyledButton
            onClick={autoResizeColumn}
            buttonTheme="basic"
            disabled={!column}
          >
            <StyledText>Auto size this column</StyledText>
          </StyledButton>
        </FormButtonContainer>
      </ActionContainer>
      <ActionContainer>
        <FormButtonContainer>
          <StyledButton onClick={autoResizeAllColumns} buttonTheme="basic">
            <StyledText>Auto size all columns</StyledText>
          </StyledButton>
        </FormButtonContainer>
      </ActionContainer>
    </View>
  );
};
