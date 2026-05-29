import { useGridTheme } from "../../themes";
import { isEqual } from "lodash";
import * as React from "react";
import type { LayoutRectangle } from "react-native";
import {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";

import { useGridLayout, useGridSelection } from "../../view/context";
import { useDeepEqChange } from "../../internal/hooks";
import type {
  ColumnSection,
  GridContentIndexes,
  GridContext,
  GridIconType,
  OverrideIcon,
  PinnedStatus,
  RowNode,
  RowSelectionMode,
  SelectedCellParams,
  SkiaInternalGridColumn,
} from "../../core/types";
import { MIN_COLUMN_SIZE } from "../../utils/constants";
import { createCellContentLayer } from "../gridLayers";
import {
  calculateBufferIndexes,
  checkIndexes,
  DEFAULT_ICONS,
  deriveIndexes,
  getEmptyPicture,
} from "../../utils/gridUtils";
import { usePictures } from "./usePictures";

type CellContentPictureArgs<T extends Object> = {
  layout: SharedValue<LayoutRectangle>;
  y: SharedValue<number>;
  rowHeight: number;
  rowBuffer: number;
  columnBuffer: number;
  columnWidths: Record<ColumnSection, number>;
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  xValOffset: Record<ColumnSection, SharedValue<number>>;
  xVal: Record<ColumnSection, number>;
  widths: Record<ColumnSection, number[]>;
  sectionWidth: Record<ColumnSection, number>;
  isRowSelected?: (node: RowNode<T>) => 0 | 1 | 2;
  context?: GridContext;
  selectedCellParams: SelectedCellParams<T>;
  rowSelection: RowSelectionMode;
  gridIcons?: Partial<Record<GridIconType, OverrideIcon>>;
  cellFontSize?: number;
};

const DEFAULT_GRID_CONTENT_INDEXES: GridContentIndexes = {
  cols: { start: 0, end: -1 },
  rows: { start: 0, end: -1 },
};

export function useCellContent<T extends Object>(
  args: CellContentPictureArgs<T>
) {
  const {
    layout,
    y,
    rowHeight,
    columnBuffer,
    rowBuffer,
    sectionWidth,
    columnWidths,
    columns,
    xVal,
    xValOffset,
    widths,
    isRowSelected,
    context,
    selectedCellParams,
    rowSelection,
    gridIcons,
    cellFontSize,
  } = args;

  const { topRowNode, fullHeight, fontManager, totalHeaderHeight } =
    useGridLayout();
  const { rows, nodesSelection } = useGridSelection();
  const theme = useGridTheme();

  const pictures = usePictures(
    sectionWidth,
    layout.value.height - totalHeaderHeight,
    totalHeaderHeight
  );

  const currentIndexes = React.useRef<Record<PinnedStatus, GridContentIndexes>>(
    {
      left: DEFAULT_GRID_CONTENT_INDEXES,
      right: DEFAULT_GRID_CONTENT_INDEXES,
      none: DEFAULT_GRID_CONTENT_INDEXES,
    }
  );

  const getBufferCombinedIndexes = (
    columnWidths: number[],
    xValOffset: number,
    y: number,
    sectionWidth: number,
    totalColumnWidth: number,
    columns: SkiaInternalGridColumn<T>[],
    pinnedStatus: PinnedStatus,
    layout: LayoutRectangle,
    redrawContent: boolean
  ): { indexes: GridContentIndexes; drawContent: boolean } => {
    const hVal =
      Math.min(layout.height, fullHeight) -
      totalHeaderHeight +
      (topRowNode ? rowHeight : 0);

    const indexes = deriveIndexes(
      columnWidths,
      rowHeight,
      xValOffset,
      y,
      sectionWidth,
      hVal,
      fullHeight,
      totalColumnWidth,
      rows.length
    );

    const bufferCombinedIndexes = calculateBufferIndexes(
      indexes,
      columns,
      columnBuffer,
      rowBuffer,
      rows.length
    );

    const shouldDrawContent = checkIndexes(
      indexes,
      currentIndexes.current[pinnedStatus]
    );

    if (shouldDrawContent || redrawContent)
      currentIndexes.current[pinnedStatus] = bufferCombinedIndexes;

    return {
      indexes: bufferCombinedIndexes,
      drawContent: shouldDrawContent,
    };
  };

  const createCellContent = (
    derivedXValOffset: Record<ColumnSection, number>,
    derivedY: number,
    redrawContent = false,
    derivedLayout?: LayoutRectangle
  ) => {
    for (const typedKey of Object.keys(columns) as ColumnSection[]) {
      if (columns[typedKey].length) {
        const pinnedStatus = typedKey === "center" ? "none" : typedKey;

        const { indexes, drawContent } = getBufferCombinedIndexes(
          widths[typedKey],
          derivedXValOffset[typedKey],
          derivedY,
          sectionWidth[typedKey],
          columnWidths[typedKey],
          columns[typedKey],
          pinnedStatus,
          derivedLayout ?? layout.value,
          redrawContent
        );

        if (
          (drawContent || redrawContent) &&
          !isEqual(indexes, DEFAULT_GRID_CONTENT_INDEXES)
        ) {
          pictures[typedKey].value = createCellContentLayer<T>({
            totalHeaderHeight,
            rowHeight,
            fullHeight,
            columnWidths,
            xVal,
            rows,
            pinnedStatus,
            indexes,
            topRowNode,
            columns: columns[typedKey],
            isRowSelected,
            context,
            theme,
            nodesSelection,
            selectedCellParams,
            fontManager,
            rowSelection,
            icons: {
              ...DEFAULT_ICONS,
              ...(gridIcons ?? {}),
            },
            cellFontSize,
          });
        }
      } else {
        pictures[typedKey].value = getEmptyPicture({
          x: derivedXValOffset[typedKey],
          y: totalHeaderHeight,
          width: sectionWidth[typedKey],
          height: layout.value.height - totalHeaderHeight,
        });
      }
    }
  };

  // `selectedCellParams` is frequently set to equivalent content (e.g.,
  // `{ row: null, cellEditingParams: null }`) from multiple call sites. Using
  // the object reference directly as an effect dep triggers spurious picture
  // re-records. `useDeepEqChange` returns a stable ID that only changes when
  // the object's content actually differs, eliminating those wasted redraws.
  const selectedCellParamsKey = useDeepEqChange([selectedCellParams]);

  React.useEffect(() => {
    createCellContent(
      {
        left: xValOffset.left.value,
        right: xValOffset.right.value,
        center: xValOffset.center.value,
      },
      y.value,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    theme,
    fontManager,
    rows,
    !!topRowNode,
    columns.left,
    columns.right,
    columns.center,
    columnWidths.left,
    columnWidths.center,
    columnWidths.right,
    sectionWidth.center,
    sectionWidth.left,
    sectionWidth.right,
    nodesSelection,
    selectedCellParamsKey,
    context?.current,
    cellFontSize,
  ]);

  // Tracks the last UI→JS bridged position. The animated reaction below
  // uses this to skip bridging during scroll that stays within the viewport
  // buffer — `createCellContent` would have early-exited on the JS side via
  // `checkIndexes` anyway. `NEGATIVE_INFINITY` forces the first meaningful
  // scroll to bridge regardless of starting position.
  const lastBridge = useSharedValue({
    y: Number.NEGATIVE_INFINITY,
    xLeft: 0,
    xCenter: 0,
    xRight: 0,
    layoutWidth: 0,
    layoutHeight: 0,
  });

  useAnimatedReaction(
    () => {
      const xVal = {
        left: xValOffset.left.value,
        right: xValOffset.right.value,
        center: xValOffset.center.value,
      };
      return {
        xValOffset: xVal,
        y: y.value,
        layout: layout.value,
      };
    },
    (current, _previous) => {
      const last = lastBridge.value;

      // Layout dimension change (orientation, resize) must always bridge.
      const layoutChanged =
        current.layout.width !== last.layoutWidth ||
        current.layout.height !== last.layoutHeight;

      // Conservative thresholds: half the buffer in pixels. By the time the
      // cumulative scroll delta from the last bridge approaches the actual
      // buffer edge, another bridge has already fired — so `checkIndexes`
      // on the JS side still runs before any legitimate redraw is missed.
      // Columns are guaranteed to be at least `MIN_COLUMN_SIZE` wide, so
      // `columnBuffer * MIN_COLUMN_SIZE` is a safe lower bound for x.
      const yThreshold = (rowBuffer * rowHeight) / 2;
      const xThreshold = (columnBuffer * MIN_COLUMN_SIZE) / 2;

      const scrollExceedsThreshold =
        Math.abs(current.y - last.y) >= yThreshold ||
        Math.abs(current.xValOffset.left - last.xLeft) >= xThreshold ||
        Math.abs(current.xValOffset.center - last.xCenter) >= xThreshold ||
        Math.abs(current.xValOffset.right - last.xRight) >= xThreshold;

      if (layoutChanged || scrollExceedsThreshold) {
        lastBridge.value = {
          y: current.y,
          xLeft: current.xValOffset.left,
          xCenter: current.xValOffset.center,
          xRight: current.xValOffset.right,
          layoutWidth: current.layout.width,
          layoutHeight: current.layout.height,
        };
        runOnJS(createCellContent)(
          current.xValOffset,
          current.y,
          false,
          current.layout
        );
      }
    },
    [xValOffset, y, layout]
  );

  return pictures;
}

export default useCellContent;
