import { useGridTheme } from "../../themes";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";

import { useGridLayout } from "../../view/context";
import {
  type ColumnSection,
  type SectionSeparatorKeys,
  SectionSeparators,
} from "../../core/types";
import { createSectionOverlayLayer } from "../gridLayers";
import { getEmptyPicture } from "../../utils/gridUtils";
import { usePicturesWorklet } from "./usePictures";

type SectionOverlayPictureArgs = {
  layout: SharedValue<LayoutRectangle>;
  sectionWidth: Record<ColumnSection, number>;
  xVal: Record<ColumnSection, number>;
  resizedWidth?: SharedValue<number> | null;
  selectedSection?: SectionSeparatorKeys | null;
  isSectionResizing?: boolean;
  headerHeight: number;
};

export function useSectionOverlay(args: SectionOverlayPictureArgs) {
  const {
    layout,
    sectionWidth,
    resizedWidth,
    headerHeight,
    xVal,
    selectedSection,
    isSectionResizing,
  } = args;

  const { fullHeight, fontManager, totalHeaderHeight } = useGridLayout();
  const theme = useGridTheme();

  const pictures = usePicturesWorklet(
    sectionWidth,
    Math.min(layout.value.height, fullHeight) - totalHeaderHeight,
    0
  );

  const createSectionOverlay = (width?: number) => {
    const resizeXVal = {
      left: 0,
      center: 0,
      right: layout.value.width - (width ?? resizedWidth?.value ?? 0),
    } as Record<ColumnSection, number>;

    Object.values(SectionSeparators).forEach(
      (section: SectionSeparatorKeys) => {
        pictures[section].value = getEmptyPicture({
          x: xVal[section],
          y: 0,
          width: sectionWidth[section],
          height: Math.min(layout.value.height, fullHeight) - totalHeaderHeight,
        });
      }
    );

    if (selectedSection) {
      const yVal = Math.min(fullHeight, layout.value.height);

      const picture = createSectionOverlayLayer({
        xVal: resizeXVal,
        theme,
        yVal,
        canvasWidth: isSectionResizing ? width ?? resizedWidth?.value ?? 0 : 0,
        selectedSection,
        headerHeight,
        fontManager,
        isSectionResizing: isSectionResizing || false,
      });

      pictures[selectedSection].value = picture;
    }
  };

  React.useEffect(() => {
    createSectionOverlay();
  }, [
    theme,
    fontManager,
    selectedSection,
    resizedWidth,
    xVal,
    sectionWidth,
    isSectionResizing,
  ]);

  useAnimatedReaction(
    () => resizedWidth,
    (current) => {
      runOnJS(createSectionOverlay)(current?.value);
    }
  );

  return pictures;
}

export default useSectionOverlay;
