import { type SkHostRect, rect } from "@shopify/react-native-skia";
import {
  type DerivedValue,
  type SharedValue,
  useDerivedValue,
} from "react-native-reanimated";

import type { ColumnSection, SectionSeparatorKeys } from "../../core/types";
import { translationClamp } from "../sectionWidthUtils";

export function useDerivedClip(
  xVal: Record<ColumnSection, SharedValue<number>>,
  cellTransform: Record<ColumnSection, SharedValue<{ width: number }>>,
  columnWidths: Record<ColumnSection, number>,
  fullHeight: number,
  verticalSeparationWidths: Record<SectionSeparatorKeys, number>
) {
  const left = useDerivedValue(() => {
    const x = Math.abs(
      translationClamp(
        xVal.left.value,
        cellTransform.left.value.width - columnWidths.left
      )
    );

    return rect(x, 0, cellTransform.left.value.width, fullHeight);
  });

  const center = useDerivedValue(() => {
    const x =
      Math.abs(
        translationClamp(
          xVal.center.value,
          cellTransform.center.value.width - columnWidths.center
        )
      ) +
      cellTransform.left.value.width +
      verticalSeparationWidths.left;

    return rect(x, 0, cellTransform.center.value.width, fullHeight);
  });

  const right = useDerivedValue(() => {
    const x =
      Math.abs(
        translationClamp(
          xVal.right.value,
          cellTransform.right.value.width - columnWidths.right
        )
      ) +
      cellTransform.left.value.width +
      cellTransform.center.value.width +
      verticalSeparationWidths.right +
      verticalSeparationWidths.left;

    return rect(x, 0, cellTransform.right.value.width, fullHeight);
  });

  return { left, right, center } as Record<
    ColumnSection,
    DerivedValue<SkHostRect>
  >;
}

export default useDerivedClip;
