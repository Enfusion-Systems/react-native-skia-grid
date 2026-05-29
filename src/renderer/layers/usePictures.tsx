import type { SkPicture } from "@shopify/react-native-skia";
import * as React from "react";
import { useSharedValue } from "react-native-reanimated";

import type { ColumnSection } from "../../core/types";
import { getEmptyPicture } from "../../utils/gridUtils";

export function usePicturesWorklet(
  sectionWidth: Record<ColumnSection, number>,
  height: number,
  y: number
) {
  const left = useSharedValue<SkPicture>(
    getEmptyPicture({ x: 0, y, width: sectionWidth.left, height })
  );

  const right = useSharedValue<SkPicture>(
    getEmptyPicture({
      x: sectionWidth.left + sectionWidth.center,
      y,
      width: sectionWidth.right,
      height,
    })
  );

  const center = useSharedValue<SkPicture>(
    getEmptyPicture({
      x: sectionWidth.left,
      y,
      width: sectionWidth.center,
      height,
    })
  );

  return React.useMemo(() => ({ left, right, center }), [left, right, center]);
}

export function usePictures(
  sectionWidth: Record<ColumnSection, number>,
  height: number,
  y: number
) {
  const left = useSharedValue<SkPicture>(
    getEmptyPicture({ x: 0, y, width: sectionWidth.left, height })
  );

  const right = useSharedValue<SkPicture>(
    getEmptyPicture({
      x: sectionWidth.left + sectionWidth.center,
      y,
      width: sectionWidth.right,
      height,
    })
  );

  const center = useSharedValue<SkPicture>(
    getEmptyPicture({
      x: sectionWidth.left,
      y,
      width: sectionWidth.center,
      height,
    })
  );

  return React.useMemo(() => ({ left, right, center }), [left, right, center]);
}

export function usePicturesSeparator(
  sectionWidth: Record<ColumnSection, number>,
  columnSectionSpacingWidth: {
    left: number;
    right: number;
  },
  height: number
) {
  const left = useSharedValue<SkPicture>(
    getEmptyPicture({
      x: sectionWidth.left,
      y: 0,
      width: columnSectionSpacingWidth.left,
      height,
    })
  );

  const right = useSharedValue<SkPicture>(
    getEmptyPicture({
      x:
        sectionWidth.left +
        columnSectionSpacingWidth.left +
        sectionWidth.center,
      y: 0,
      width: columnSectionSpacingWidth.right,
      height,
    })
  );

  return React.useMemo(() => ({ left, right }), [left, right]);
}
