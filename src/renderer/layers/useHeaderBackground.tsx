import { useGridTheme } from "../../themes";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { useGridLayout } from "../../view/context";
import {
  type ColumnSection,
  type SkiaInternalGridColumn,
  PinnedStatuses,
} from "../../core/types";
import { createHeaderBackgroundLayer } from "../gridLayers";
import {
  buildColGroupDepthMap,
  computeColumnGroupHeaders,
} from "../../utils/gridUtils";
import { usePicturesWorklet } from "./usePictures";

type HeaderBackgroundPictureArgs<T extends Object> = {
  layout: SharedValue<LayoutRectangle>;
  sectionWidth: Record<ColumnSection, number>;
  xVal: Record<ColumnSection, number>;
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  columnWidths: Record<ColumnSection, number>;
  rowHeight: number;
  headerHeight: number;
};

export function useHeaderBackground<T extends Object>(
  args: HeaderBackgroundPictureArgs<T>
) {
  const {
    layout,
    sectionWidth,
    xVal,
    columns,
    columnWidths,
    headerHeight,
    rowHeight,
  } = args;

  const { topRowNode, fontManager, totalHeaderHeight, columnGroupPaths } =
    useGridLayout();
  const theme = useGridTheme();

  const pictures = usePicturesWorklet(sectionWidth, totalHeaderHeight, 0);

  // Group geometry depends only on per-section columns + group paths, but the
  // outer effect re-runs for theme, fontManager, layout, and width changes.
  // Memoize so unrelated re-renders don't recompute these.
  const groupGeometry = React.useMemo(() => {
    const result: Record<
      ColumnSection,
      {
        columnGroupHeaders: ReturnType<typeof computeColumnGroupHeaders>;
        colGroupDepthMap: ReturnType<typeof buildColGroupDepthMap>;
      }
    > = { left: undefined!, center: undefined!, right: undefined! };
    for (const status of ["left", "center", "right"] as ColumnSection[]) {
      const columnGroupHeaders = computeColumnGroupHeaders(
        columns[status],
        columnGroupPaths
      );
      const colGroupDepthMap = buildColGroupDepthMap(
        columnGroupHeaders,
        columns[status]
      );
      result[status] = { columnGroupHeaders, colGroupDepthMap };
    }
    return result;
  }, [columns.left, columns.center, columns.right, columnGroupPaths]);

  React.useEffect(() => {
    for (const pinnedStatus of Object.values(PinnedStatuses)) {
      const status = pinnedStatus === "none" ? "center" : pinnedStatus;
      const { columnGroupHeaders, colGroupDepthMap } = groupGeometry[status];

      pictures[status].value = createHeaderBackgroundLayer<T>({
        theme,
        headerHeight,
        totalHeaderHeight,
        columnGroupHeaders,
        colGroupDepthMap,
        columnWidths,
        xVal,
        topRowNodeHeight: topRowNode ? rowHeight : 0,
        columns: columns[status],
        pinnedStatus: status,
        fontManager,
        rowSelection: "single",
      });
    }
  }, [
    theme,
    fontManager,
    !!topRowNode,
    layout.value.width,
    columns.left,
    columns.center,
    columns.right,
    columnWidths.left,
    columnWidths.center,
    columnWidths.right,
    xVal,
    columnGroupPaths,
    totalHeaderHeight,
  ]);

  return pictures;
}

export default useHeaderBackground;
