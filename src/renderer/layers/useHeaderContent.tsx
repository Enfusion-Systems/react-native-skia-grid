import { useGridTheme } from "../../themes";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { useGridActions, useGridLayout } from "../../view/context";
import {
  type ColumnSection,
  type GridIconType,
  type OverrideIcon,
  type SkiaInternalGridColumn,
  PinnedStatuses,
} from "../../core/types";
import { createHeaderContentLayer } from "../gridLayers";
import {
  buildColGroupDepthMap,
  computeColumnGroupHeaders,
  DEFAULT_ICONS,
} from "../../utils/gridUtils";
import { usePictures } from "./usePictures";

type HeaderContentPictureArgs<T extends Object> = {
  layout: SharedValue<LayoutRectangle>;
  sectionWidth: Record<ColumnSection, number>;
  xVal: Record<ColumnSection, number>;
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  columnWidths: Record<ColumnSection, number>;
  headerSelectionState: 0 | 1 | 2;
  rowHeight: number;
  gridIcons?: Partial<Record<GridIconType, OverrideIcon>>;
  headerHeight: number;
  fontSize?: number;
  cellFontSize?: number;
};

export function useHeaderContent<T extends Object>(
  args: HeaderContentPictureArgs<T>
) {
  const {
    layout,
    headerSelectionState,
    sectionWidth,
    xVal,
    columnWidths,
    headerHeight,
    rowHeight,
    gridIcons,
    columns,
    fontSize,
    cellFontSize,
  } = args;
  const { topRowNode, fontManager, totalHeaderHeight, columnGroupPaths } =
    useGridLayout();
  const { filterState, sortStatus } = useGridActions();
  const theme = useGridTheme();

  const pictures = usePictures(sectionWidth, totalHeaderHeight, 0);

  // Same memoization as useHeaderBackground: group geometry depends only on
  // per-section columns + group paths, but the outer effect re-runs on theme,
  // sort, filter, layout, and width changes too.
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

      pictures[status].value = createHeaderContentLayer<T>({
        xVal,
        sortStatus,
        columnWidths,
        filterState,
        theme,
        headerHeight,
        totalHeaderHeight,
        columnGroupHeaders,
        colGroupDepthMap,
        topRowNodeHeight: topRowNode ? rowHeight : 0,
        topRowNode,
        headerSelectionState,
        icons: {
          ...DEFAULT_ICONS,
          ...(gridIcons ?? {}),
        },
        fontManager,
        columns: columns[status],
        rowSelection: "single",
        pinnedStatus: status,
        fontSize,
        cellFontSize,
      });
    }
  }, [
    theme,
    fontManager,
    filterState,
    sortStatus,
    headerSelectionState,
    layout.value.width,
    columns,
    xVal,
    topRowNode,
    columnGroupPaths,
    totalHeaderHeight,
    fontSize,
    cellFontSize,
  ]);

  return pictures;
}

export default useHeaderContent;
