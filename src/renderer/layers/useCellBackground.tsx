import { useGridTheme } from "../../themes";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { useGridLayout, useGridSelection } from "../../view/context";
import {
  type ColumnSection,
  type SkiaInternalGridColumn,
  PinnedStatuses,
} from "../../core/types";
import { createCellBackgroundLayer } from "../gridLayers";
import { usePicturesWorklet } from "./usePictures";

type CellBackgroundPictureArgs<T extends Object> = {
  layout: SharedValue<LayoutRectangle>;
  sectionWidth: Record<ColumnSection, number>;
  xVal: Record<ColumnSection, number>;
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  columnWidths: Record<ColumnSection, number>;
  rowHeight: number;
};

export function useCellBackground<T extends Object>(
  args: CellBackgroundPictureArgs<T>
) {
  const { layout, sectionWidth, xVal, columns, columnWidths, rowHeight } = args;

  const { topRowNode, fontManager, totalHeaderHeight } = useGridLayout();
  const { rows } = useGridSelection();

  const pictures = usePicturesWorklet(
    sectionWidth,
    layout.value.height - totalHeaderHeight,
    totalHeaderHeight
  );
  const theme = useGridTheme();

  React.useEffect(() => {
    for (const pinnedStatus of Object.values(PinnedStatuses)) {
      const status = pinnedStatus === "none" ? "center" : pinnedStatus;
      pictures[status].value = createCellBackgroundLayer<T>({
        columnWidths,
        theme,
        totalHeaderHeight,
        rowHeight,
        rowsData: rows,
        xVal,
        fullHeight: rows.length * rowHeight,
        topRowNode: !!topRowNode,
        pinnedStatus: status,
        rowSelection: "single",
        fontManager,
      });
    }
  }, [
    theme,
    fontManager,
    !!topRowNode,
    layout.value.width,
    columns.left.length,
    columns.center.length,
    columns.right.length,
    columnWidths.left,
    columnWidths.center,
    columnWidths.right,
    xVal,
    rows.length,
  ]);

  return pictures;
}

export default useCellBackground;
