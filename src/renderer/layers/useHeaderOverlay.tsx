import { useGridTheme } from "../../themes";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";

import { useGridColumns, useGridLayout } from "../../view/context";
import type { ColumnSection, SkiaInternalGridColumn } from "../../core/types";
import { createHeaderOverlayLayer } from "../gridLayers";
import {
  buildColGroupDepthMap,
  computeColumnGroupHeaders,
  getEmptyPicture,
} from "../../utils/gridUtils";
import { usePicturesWorklet } from "./usePictures";

type HeaderOverlayPictureArgs<T extends Object> = {
  layout: SharedValue<LayoutRectangle>;
  sectionWidth: Record<ColumnSection, number>;
  xVal: Record<ColumnSection, number>;
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  resizedWidth?: SharedValue<number> | null;
  headerHeight: number;
};

export function useHeaderOverlay<T extends Object>(
  args: HeaderOverlayPictureArgs<T>
) {
  const { layout, sectionWidth, columns, resizedWidth, headerHeight, xVal } =
    args;

  const { fullHeight, fontManager, totalHeaderHeight, columnGroupPaths } =
    useGridLayout();
  const {
    columns: allColumns,
    isColumnResizing,
    selectedColumn,
  } = useGridColumns();
  const theme = useGridTheme();
  const pictures = usePicturesWorklet(sectionWidth, totalHeaderHeight, 0);

  const column = React.useMemo(
    () =>
      selectedColumn
        ? allColumns.find((e) => e.__id === selectedColumn.__id)
        : undefined,
    [selectedColumn, columns]
  );

  const key = React.useMemo(() => {
    if (!column) return undefined;
    return typeof column.pinned === "string" ? column.pinned : "center";
  }, [column]);

  const canvasWidth = React.useMemo(
    () => (isColumnResizing ? resizedWidth?.value : column?.width ?? 0),
    [isColumnResizing, resizedWidth?.value, column]
  );

  const createHeaderOverlay = (width?: number) => {
    for (const key of Object.keys(columns) as ColumnSection[]) {
      pictures[key].value = getEmptyPicture({
        x: xVal[key],
        y: 0,
        width: sectionWidth[key],
        height: totalHeaderHeight,
      });
    }

    if (column && !!key) {
      const yVal = isColumnResizing
        ? Math.min(fullHeight, layout.value.height)
        : totalHeaderHeight;

      const sectionColumns = columns[key];
      const columnGroupHeaders = computeColumnGroupHeaders(
        sectionColumns,
        columnGroupPaths
      );
      const colGroupDepthMap = buildColGroupDepthMap(
        columnGroupHeaders,
        sectionColumns
      );

      const picture = createHeaderOverlayLayer<T>({
        xVal,
        headerHeight,
        totalHeaderHeight,
        columnGroupHeaders,
        colGroupDepthMap,
        theme,
        yVal,
        isColumnResizing,
        selectedColumn: column,
        canvasWidth: width ?? canvasWidth ?? 0,
        columns,
        fontManager,
        rowSelection: "single",
      });

      pictures[key].value = picture;
    }
  };

  React.useEffect(() => {
    createHeaderOverlay();
  }, [
    theme,
    fontManager,
    selectedColumn,
    columns,
    canvasWidth,
    xVal,
    sectionWidth,
  ]);

  useAnimatedReaction(
    () => resizedWidth,
    (current) => runOnJS(createHeaderOverlay)(current?.value)
  );

  return pictures;
}

export default useHeaderOverlay;
