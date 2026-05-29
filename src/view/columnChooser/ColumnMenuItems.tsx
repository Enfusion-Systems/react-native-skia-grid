import type { ColumnChooserColumn } from "./types";
import { useSlots } from "../slots";
import { NormalFontAwesomeIcon, useCommonStyles } from "../slots/defaults";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faPlusCircle, faTrash } from "@fortawesome/pro-solid-svg-icons";
import * as React from "react";
import { View } from "react-native";
import { RenderItemParams } from "react-native-draggable-flatlist";

import {
  ClickTarget,
  MenuItemContainer,
  MenuItemOuterContainer,
  Row,
  stylesheet,
} from "./styled";

export const ColumnMenuItems: React.FC<
  Partial<RenderItemParams<ColumnChooserColumn>> & {
    item: ColumnChooserColumn;
    onAdd?: (item: ColumnChooserColumn[]) => void;
    onRemove?: (item: ColumnChooserColumn) => void;
  }
> = React.memo(({ item, isActive, drag, onAdd, onRemove, getIndex }) => {
  const { FlexView, Text: NormalText } = useSlots();
  const cs = useCommonStyles();
  return (
    <MenuItemOuterContainer
      activeOpacity={1}
      onLongPress={drag}
      disabled={isActive}
      top={getIndex?.() === 0}
    >
      <MenuItemContainer isDragged={!!isActive}>
        <Row>
          {onAdd ? (
            <ClickTarget
              onPress={() => {
                onAdd([item]);
              }}
              disabled={isActive}
            >
              <View style={stylesheet.clickTarget}>
                <NormalFontAwesomeIcon icon={faPlusCircle as IconDefinition} />
              </View>
            </ClickTarget>
          ) : null}
          <FlexView>
            <NormalText style={cs.marginLeftFive}>
              {item.name}
            </NormalText>
          </FlexView>
          {onRemove ? (
            <ClickTarget
              onPress={() => {
                onRemove(item);
              }}
              disabled={isActive}
            >
              <View style={stylesheet.clickTarget}>
                <NormalFontAwesomeIcon icon={faTrash as IconDefinition} />
              </View>
            </ClickTarget>
          ) : null}
        </Row>
      </MenuItemContainer>
    </MenuItemOuterContainer>
  );
});
