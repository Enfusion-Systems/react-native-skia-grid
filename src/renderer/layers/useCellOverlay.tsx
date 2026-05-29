import { useGridTheme } from "../../themes";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { useGridLayout, useGridSelection } from "../../view/context";
import { useDeepEqChange } from "../../internal/hooks";
import {
  type ColumnSection,
  type SelectedCellParams,
  type SkiaInternalGridColumn,
  PinnedStatuses,
} from "../../core/types";
import { createOverlayLayer } from "../gridLayers";
import { getEmptyPicture } from "../../utils/gridUtils";
import { usePicturesWorklet } from "./usePictures";

type CellOverlayPictureArgs<T extends Object> = {
  layout: SharedValue<LayoutRectangle>;
  rowHeight: number;
  columnWidths: Record<ColumnSection, number>;
  sectionWidth: Record<ColumnSection, number>;
  xVal: Record<ColumnSection, number>;
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  rowSelection: "single" | "multiple";
  selectedCellParams: SelectedCellParams<T>;
};

export function useCellOverlay<T extends Object>(
  args: CellOverlayPictureArgs<T>
) {
  const {
    layout,
    rowHeight,
    columnWidths,
    sectionWidth,
    xVal,
    columns,
    rowSelection,
    selectedCellParams,
  } = args;

  const { topRowNode, fullHeight, fontManager, totalHeaderHeight } =
    useGridLayout();
  const { getSelectedNodes, nodesSelection, rows } = useGridSelection();

  const pictures = usePicturesWorklet(
    sectionWidth,
    layout.value.height - totalHeaderHeight,
    totalHeaderHeight
  );
  const theme = useGridTheme();

  const selectedCellParamsKey = useDeepEqChange([selectedCellParams]);

  React.useEffect(() => {
    const rowPressed = selectedCellParams.row;
    if (rowSelection !== "single" || rowPressed) {
      const yPos = rowPressed ? rowHeight * rowPressed.__index : 0;

      for (const pinnedStatus of Object.values(PinnedStatuses)) {
        const status = pinnedStatus === "none" ? "center" : pinnedStatus;
        pictures[status].value = createOverlayLayer<T>({
          totalHeaderHeight,
          rowHeight,
          yPos,
          pinnedStatus,
          columnWidths,
          xVal,
          topRowNode: !!topRowNode,
          rowsData: getSelectedNodes(),
          fullHeight,
          rowSelection,
          selectedCellParams,
          nodesSelection,
          columns: columns[status],
          theme,
          fontManager,
        });
      }
    } else if (!rowPressed) {
      for (const pinnedStatus of Object.values(PinnedStatuses)) {
        const status = pinnedStatus === "none" ? "center" : pinnedStatus;

        pictures[status].value = getEmptyPicture({
          x: xVal[status],
          y: totalHeaderHeight,
          width: sectionWidth[status],
          height: layout.value.height - totalHeaderHeight,
        });
      }
    }
  }, [
    theme,
    fontManager,
    nodesSelection,
    rows,
    selectedCellParamsKey,
    sectionWidth,
    xVal,
    rowSelection,
    columnWidths,
    layout,
    !!topRowNode,
  ]);

  return pictures;
}

export default useCellOverlay;
