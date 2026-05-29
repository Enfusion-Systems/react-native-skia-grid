import { useRefCallback } from "../../../internal/hooks";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { View } from "react-native";

import type { PinActionsType, SkiaInternalGridColumn } from "../../../core/types";
import type { GridContextSnapshot } from "../../context";
import {
  ActionContainer,
  FormButtonContainer,
  StyledButton,
  StyledText,
  StyledTopBar,
} from "../shared/formActionStyles";

type ActionsStackParamList = { ActionsMenu: {}; Pin: {} };

export type FiltersNavigationProp = NativeStackNavigationProp<
  ActionsStackParamList,
  "Pin"
>;

type PinButtonProps = {
  onClick: (value: PinActionsType) => void;
  label: string;
  value: PinActionsType;
  selectedValue?: PinActionsType;
};

const PinButton = ({
  onClick,
  value,
  selectedValue,
  label,
}: PinButtonProps) => (
  <StyledButton
    onClick={() => onClick(value)}
    buttonTheme={selectedValue === value ? "primary" : "basic"}
  >
    <StyledText>{label}</StyledText>
  </StyledButton>
);

export const PinMenu: React.FC<{
  column: SkiaInternalGridColumn;
  onBackClick: VoidFunction;
  useGridActions: () => GridContextSnapshot;
}> = ({ column, onBackClick, useGridActions }) => {
  const { onPinned } = useGridActions();
  const [action, setAction] = React.useState<PinActionsType | undefined>(null);

  React.useEffect(() => {
    setAction(column?.pinned);
  }, [column]);

  const handlePin = useRefCallback(
    (key: PinActionsType) => {
      setAction(key);
      if (column) onPinned?.(column, key);
    },
    [onPinned, column]
  );

  return (
    <View>
      <StyledTopBar title="Pin" onBackClick={onBackClick} />
      <ActionContainer>
        <FormButtonContainer>
          <PinButton
            label="Left"
            value="left"
            onClick={handlePin}
            selectedValue={action}
          />
        </FormButtonContainer>
      </ActionContainer>
      <ActionContainer>
        <FormButtonContainer>
          <PinButton
            label="None"
            value={null}
            onClick={handlePin}
            selectedValue={action}
          />
        </FormButtonContainer>
      </ActionContainer>
      <ActionContainer>
        <FormButtonContainer>
          <PinButton
            label="Right"
            value="right"
            onClick={handlePin}
            selectedValue={action}
          />
        </FormButtonContainer>
      </ActionContainer>
    </View>
  );
};
