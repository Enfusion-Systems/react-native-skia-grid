import { useGridTheme } from "../../themes";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { useGridLayout } from "../../view/context";
import {
  type ColumnSection,
  type SectionSeparatorKeys,
  type SkiaInternalGridColumn,
  SectionSeparators,
} from "../../core/types";
import { createSectionSeparatorLayer } from "../gridLayers";
import { usePicturesSeparator } from "./usePictures";

type SectionSeparatorPictureArgs<T extends Object> = {
  layout: SharedValue<LayoutRectangle>;
  sectionWidth: Record<ColumnSection, number>;
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  columnWidths: Record<ColumnSection, number>;
  bottomInset: number;
  columnSeparatorWidths: Record<SectionSeparatorKeys, number>;
};

export function useSectionSeparator<T extends Object>(
  args: SectionSeparatorPictureArgs<T>
) {
  const {
    layout,
    sectionWidth,
    columns,
    columnWidths,
    bottomInset,
    columnSeparatorWidths,
  } = args;

  const { fullHeight, fontManager } = useGridLayout();
  const theme = useGridTheme();

  const height = React.useMemo(
    () => Math.min(fullHeight - bottomInset, layout.value.height),
    [fullHeight, bottomInset, layout.value.height]
  );

  const pictures = usePicturesSeparator(
    sectionWidth,
    columnSeparatorWidths,
    height
  );

  React.useEffect(() => {
    for (const section of Object.values(SectionSeparators)) {
      let x = sectionWidth.left;
      if (section !== "left")
        x += columnSeparatorWidths.left + sectionWidth.center;

      const width = columnSeparatorWidths[section];

      pictures[section].value = createSectionSeparatorLayer({
        x,
        height,
        width,
        theme,
        fontManager,
      });
    }
  }, [
    theme,
    fontManager,
    layout.value.width,
    columns.left.length,
    columns.center.length,
    columns.right.length,
    columnWidths.left,
    columnWidths.center,
    columnWidths.right,
    sectionWidth,
    height,
    columnSeparatorWidths,
  ]);

  return pictures;
}
