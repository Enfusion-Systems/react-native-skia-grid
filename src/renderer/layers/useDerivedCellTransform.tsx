import type { Transforms3d } from "@shopify/react-native-skia";
import type { LayoutRectangle } from "react-native";
import {
  type DerivedValue,
  type SharedValue,
  useDerivedValue,
} from "react-native-reanimated";

import type { ColumnSection } from "../../core/types";
import { translationClamp } from "../sectionWidthUtils";

export function useDerivedCellTransform(
  xVal: Record<ColumnSection, SharedValue<number>>,
  cellTransform: Record<
    ColumnSection,
    SharedValue<{
      width: number;
    }>
  >,
  columnWidths: Record<ColumnSection, number>,
  layout: SharedValue<LayoutRectangle>,
  y: SharedValue<number>,
  fullHeight: number
) {
  const left = useDerivedValue(() => {
    const translateY = translationClamp(
      y.value,
      layout.value.height - fullHeight
    );
    const translateX = translationClamp(
      xVal.left.value,
      cellTransform.left.value.width - columnWidths.left
    );

    return [{ translateY }, { translateX }] as Transforms3d;
  });

  const center = useDerivedValue(() => {
    const translateY = translationClamp(
      y.value,
      layout.value.height - fullHeight
    );
    const translateX = translationClamp(
      xVal.center.value,
      cellTransform.center.value.width - columnWidths.center
    );

    return [{ translateY }, { translateX }] as Transforms3d;
  });

  const right = useDerivedValue(() => {
    const translateY = translationClamp(
      y.value,
      layout.value.height - fullHeight
    );
    const translateX = translationClamp(
      xVal.right.value,
      cellTransform.right.value.width - columnWidths.right
    );

    return [{ translateY }, { translateX }] as Transforms3d;
  });

  return { left, right, center } as Record<
    ColumnSection,
    DerivedValue<Transforms3d>
  >;
}

export default useDerivedCellTransform;
