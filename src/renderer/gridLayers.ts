import type { GridTheme } from "../themes";
import { type SkTypefaceFontProvider, Skia } from "@shopify/react-native-skia";

import {
  type ColumnSection,
  type DrawingContext,
  type GridContentIndexes,
  type GridContext,
  type GridIcons,
  type PinnedStatus,
  type RowNode,
  type RowSelectionMode,
  type SelectedCellParams,
  type SkiaInternalGridColumn,
  PinnedStatuses,
} from "../core/types";
import type {
  CreateCellBackgroundLayerProps,
  CreateCellOverlayLayerProps,
  CreateHeaderBackgroundLayerProps,
  CreateHeaderContentLayerProps,
  CreateHeaderOverlayLayerProps,
  CreateSectionOverlayLayerProps,
  NoDataLayerProps,
  SectionSeparatorLayerProps,
} from "./types";
import {
  drawCellBackground,
  drawCellContent,
  drawColumnHeaderBackground,
  drawColumnHeaderContent,
  drawHeaderOverlay,
  drawNoData,
  drawOverlayRow,
  drawSectionOverlay,
  drawSectionSeparator,
} from "./drawing/drawMethods";
import { getDrawingCtx } from "../utils/gridUtils";

function recordPicture(
  xywh: [number, number, number, number], // x, y, width, height
  ctx: [SkTypefaceFontProvider | null, GridTheme], // fontManager, theme
  cb: (ctx: DrawingContext) => void
) {
  const recorder = Skia.PictureRecorder();
  const [x, y, width, height] = xywh;
  const canvas = recorder.beginRecording(Skia.XYWHRect(x, y, width, height));
  if (width > 0 && height > 0) cb(getDrawingCtx(canvas, width, height, ...ctx));
  return recorder.finishRecordingAsPicture();
}

export function createHeaderBackgroundLayer<T extends Object>(
  props: CreateHeaderBackgroundLayerProps<T>
) {
  const {
    columns,
    headerHeight,
    totalHeaderHeight,
    topRowNodeHeight,
    columnGroupHeaders,
    colGroupDepthMap,
  } = props;
  const xVal = props.xVal[props.pinnedStatus];
  const width = props.columnWidths[props.pinnedStatus];

  return recordPicture(
    [xVal, 0, width, totalHeaderHeight + topRowNodeHeight],
    [props.fontManager, props.theme],
    (ctx) => {
      drawColumnHeaderBackground<T>(
        {
          columns,
          width,
          xOffset: xVal,
          headerHeight,
          totalHeaderHeight,
          topRowNodeHeight,
          columnGroupHeaders,
          colGroupDepthMap,
        },
        ctx
      );
    }
  );
}

export function createCellBackgroundLayer<T extends Object>(
  props: CreateCellBackgroundLayerProps<T>
) {
  const { totalHeaderHeight, topRowNode, rowHeight, fullHeight, rowsData } =
    props;

  const xVal = props.xVal[props.pinnedStatus];
  const width = props.columnWidths[props.pinnedStatus];

  const yOffset = totalHeaderHeight + (topRowNode ? rowHeight : 0);

  return recordPicture(
    [xVal, yOffset, width, fullHeight],
    [props.fontManager, props.theme],
    (ctx) => {
      drawCellBackground(
        {
          width,
          yOffset,
          fullHeight,
          rowsCount: rowsData.length,
          rowHeight,
          xOffset: xVal,
        },
        ctx
      );
    }
  );
}

export function createHeaderContentLayer<T extends Object>(
  props: CreateHeaderContentLayerProps<T>
) {
  const {
    headerHeight,
    totalHeaderHeight,
    filterState,
    sortStatus,
    columns,
    topRowNodeHeight,
    topRowNode,
    headerSelectionState,
    icons,
    columnGroupHeaders,
    colGroupDepthMap,
    fontSize,
    cellFontSize,
  } = props;

  const xVal = props.xVal[props.pinnedStatus];
  const canvasWidth = props.columnWidths[props.pinnedStatus];

  return recordPicture(
    [xVal, 0, canvasWidth, totalHeaderHeight + topRowNodeHeight],
    [props.fontManager, props.theme],
    (ctx) => {
      drawColumnHeaderContent<T>(
        {
          xOffset: xVal,

          columns,
          headerHeight,
          totalHeaderHeight,
          topRowNodeHeight,
          columnGroupHeaders,
          colGroupDepthMap,

          sortStatus,
          filterState,
          topRowNode,
          headerSelectionState,
          gridIcons: icons,
          fontSize,
          cellFontSize,
        },
        ctx
      );
    }
  );
}

type CellContentLayerArgs<T extends Object> = {
  totalHeaderHeight: number;
  rowHeight: number;
  fullHeight: number;
  rows: RowNode<T>[];
  columnWidths: Record<ColumnSection, number>;
  columns: SkiaInternalGridColumn<T>[];
  xVal: Record<ColumnSection, number>;
  fontManager: SkTypefaceFontProvider;
  theme: GridTheme;
  isRowSelected?: (node: RowNode<T>) => 0 | 1 | 2;
  context?: GridContext;
  selectedCellParams: SelectedCellParams<T>;
  topRowNode?: RowNode<T> | null;
  nodesSelection: Map<string, 0 | 1 | 2>;
  indexes: GridContentIndexes;
  pinnedStatus: PinnedStatus;
  rowSelection?: RowSelectionMode;
  icons: GridIcons;
  cellFontSize?: number;
};

export function createCellContentLayer<T extends Object>(
  args: CellContentLayerArgs<T>
) {
  const {
    totalHeaderHeight,
    rowHeight,
    fullHeight,
    rows,
    pinnedStatus,
    indexes,
    topRowNode,
    columns,
    isRowSelected,
    context,
    nodesSelection,
    selectedCellParams,
    rowSelection = "single",
    icons,
    cellFontSize,
  } = args;

  const status = pinnedStatus === "none" ? "center" : pinnedStatus;

  let yOffset = totalHeaderHeight + indexes.rows.start * rowHeight;
  if (topRowNode) yOffset += rowHeight;

  const xVal = args.xVal[status];
  const canvasWidth = args.columnWidths[status];

  const xOffset =
    columns.slice(0, indexes.cols.start).reduce((acc, i) => acc + i.width, 0) +
    xVal;

  return recordPicture(
    [xVal, totalHeaderHeight, canvasWidth, fullHeight - totalHeaderHeight],
    [args.fontManager, args.theme],
    (ctx) => {
      drawCellContent<T>(
        {
          yOffset,
          xOffset,

          rows,
          height: rowHeight,
          nodesSelection,
          rowSelection,
          selectedCellParams,
          pinnedStatus,

          columns,
          indexes,
          isRowSelected,
          context,
          icons,
          cellFontSize,
        },
        ctx
      );
    }
  );
}

export function createOverlayLayer<T extends Object>(
  props: CreateCellOverlayLayerProps<T>
) {
  const {
    totalHeaderHeight,
    rowHeight,
    pinnedStatus,
    yPos,
    topRowNode,
    rowsData,
    fullHeight,
    rowSelection,
    columns,
    selectedCellParams,
    nodesSelection,
  } = props;

  const status = pinnedStatus === "none" ? "center" : pinnedStatus;

  const selectedCellColIndex = columns.findIndex(
    (item) => item.__id === selectedCellParams?.cellEditingParams?.colDef.__id
  );
  const sliced = [...columns].slice(0, selectedCellColIndex);
  let xCellVal = 0;
  for (const c of sliced) xCellVal += c.width;

  const xVal = props.xVal[status];
  const width = props.columnWidths[status];
  xCellVal += xVal;

  const yOffset = totalHeaderHeight + (topRowNode ? rowHeight : 0);
  const y = rowSelection === "multiple" ? yOffset : yOffset + yPos;
  const height = rowSelection === "multiple" ? fullHeight : rowHeight;

  return recordPicture(
    [xVal, y, width, height],
    [props.fontManager, props.theme],
    (ctx) => {
      drawOverlayRow<T>(
        {
          y: yPos,
          xOffset: xVal,
          yOffset,
          xCellVal,
          width,
          height: rowHeight,
          rows: rowsData,
          rowSelection,
          pinnedStatus,
          selectedCellParams,
          nodesSelection,
        },
        ctx
      );
    }
  );
}

export function createHeaderOverlayLayer<T extends Object>(
  props: CreateHeaderOverlayLayerProps<T>
) {
  const {
    selectedColumn,
    canvasWidth,
    headerHeight,
    totalHeaderHeight,
    yVal,
    isColumnResizing,
    colGroupDepthMap,
  } = props;
  const pinnedStatus = selectedColumn.pinned || "center";
  const columns = props.columns[pinnedStatus];

  let xVal = props.xVal[pinnedStatus];
  for (const col of columns) {
    if (col.__id === selectedColumn.__id) break;
    xVal += col.width;
  }

  const colDepth = colGroupDepthMap?.get(selectedColumn.colId!) ?? 0;

  const overlayY = colDepth * headerHeight;
  const overlayHeight = totalHeaderHeight - overlayY;

  return recordPicture(
    [xVal, 0, canvasWidth, totalHeaderHeight],
    [props.fontManager, props.theme],
    (ctx) => {
      if (selectedColumn) {
        //We could have multiple use-cases where we might need to render resize-icon to the left
        const resizeIconSide =
          pinnedStatus === PinnedStatuses.RIGHT &&
          selectedColumn.__id === columns[columns.length - 1]?.__id
            ? "right"
            : "left";

        drawHeaderOverlay(
          {
            height: isColumnResizing ? yVal : overlayHeight,
            yOffset: overlayY,
            xOffset: xVal,
            headerHeight,
            columnWidth: selectedColumn.width,
            width: canvasWidth,
            resizeIconSide,
            isResizing: isColumnResizing,
          },
          ctx
        );
      }
    }
  );
}

export function createSectionOverlayLayer(
  args: CreateSectionOverlayLayerProps
) {
  const {
    canvasWidth,
    yVal,
    selectedSection,
    headerHeight,
    isSectionResizing,
  } = args;

  const xVal = args.xVal[selectedSection];

  return recordPicture(
    [xVal, 0, canvasWidth, yVal],
    [args.fontManager, args.theme],
    (ctx) => {
      drawSectionOverlay(
        {
          height: yVal,
          width: canvasWidth,
          xOffset: xVal,
          selectedSection,
          headerHeight,
          isResizing: isSectionResizing,
        },
        ctx
      );
    }
  );
}

export function createNoDataLayer(args: NoDataLayerProps) {
  const { canvasHeight, canvasWidth, text, rowHeight, topRowNode } = args;
  const yOffset = args.totalHeaderHeight + (topRowNode ? rowHeight : 0);

  return recordPicture(
    [0, 0, canvasWidth, canvasHeight],
    [args.fontManager, args.theme],
    (ctx) => drawNoData(ctx, yOffset, text)
  );
}

export function createSectionSeparatorLayer(args: SectionSeparatorLayerProps) {
  const { x, height, width } = args;

  return recordPicture(
    [x, 0, width, height],
    [args.fontManager, args.theme],
    (ctx) => drawSectionSeparator({ x, height, width }, ctx)
  );
}
