import {
  faFilter,
  faLeftRight,
  faSortDown,
  faSortUp,
} from "@fortawesome/pro-solid-svg-icons";
import {
  type SkTextStyle,
  BlendMode,
  ClipOp,
  Skia,
  TextAlign,
} from "@shopify/react-native-skia";

import type {
  CellRendererProps,
  ColumnFilterState,
  ColumnGroupHeader,
  DrawingContext,
  DrawLocationProps,
  DrawSvgPathArgs,
  DrawTextLocation,
  DrawTextStyleList,
  GridContentIndexes,
  GridContext,
  GridIcons,
  MultiColumnSortStatusEntry,
  OverrideIcon,
  PinnedStatus,
  RowNode,
  RowSelectionMode,
  SectionSeparatorKeys,
  SelectedCellParams,
  SkiaInternalGridColumn,
} from "../../core/types";
import {
  BOX_OFFSET,
  BOX_RADIUS,
  BOX_SIZE,
  CELL_PADDING,
  DEFAULT_FONT_SIZE,
  DEFAULT_ICON_SIZE,
  EDITABLE_CELL_PADDING,
  getPadding,
  HEADER_FONT_SIZE_DEFAULT,
  ICON_WIDTH,
  NO_DATA_DEFAULT_WIDTH,
  NO_DATA_FONT_SIZE,
  NO_DATA_PADDING,
  OOO_TEXT,
  ROW_FONT_SIZE_DEFAULT,
} from "../../utils/constants";
import { defaultFontFamily, getFont, getTextWidth } from "./fontUtils";
import { getDisplayValue, getFilterKey, getIsRowSelected } from "../../utils/gridUtils";

type DrawProps = {
  xOffset?: number;
  yOffset?: number;
};

type DrawContentProps = {
  fontSize?: number;
};

type ColumnDrawProps<T extends Object> = {
  columns: SkiaInternalGridColumn<T>[];
  headerHeight: number;
  totalHeaderHeight: number;
  topRowNodeHeight: number;
  columnGroupHeaders?: ColumnGroupHeader[];
  colGroupDepthMap?: Map<string, number>;
};

function getGroupGeometry<T extends Object>(
  group: ColumnGroupHeader,
  columns: SkiaInternalGridColumn<T>[],
  xOffset: number
): { groupX: number; groupWidth: number } {
  let groupX = xOffset;
  for (let c = 0; c < group.startColIndex; c++) {
    if (c < columns.length) groupX += columns[c].width;
  }
  let groupWidth = 0;
  for (
    let c = group.startColIndex;
    c < group.startColIndex + group.colSpan && c < columns.length;
    c++
  ) {
    groupWidth += columns[c].width;
  }
  return { groupX, groupWidth };
}

type RowDrawProps<T extends Object> = {
  rows: RowNode<T>[];
  pinnedStatus?: PinnedStatus;
  rowSelection: RowSelectionMode;
  nodesSelection: Map<string, 0 | 1 | 2>;
  selectedCellParams?: SelectedCellParams<T>;
};

type GridContextProps = {
  indexes: GridContentIndexes;
  context?: GridContext;
};

type DrawArea = {
  width: number;
  height: number;
  padding?: { left: number; right: number };
};

type DrawPosition = { x: number; y: number };

// ─── Drawing primitives ──────────────────────────────────────────────────────
// Re-exported for backward compatibility with external consumers.
// Internal functions in this file use these as well.
export {
  drawDashedLine,
  drawParagraph,
  drawSvgPath,
  getFillPaint,
  getStrokePaint,
  getTextAlign,
  layoutParagraph,
} from "./drawingPrimitives";
export type {
  DrawParagraphStyle,
  DrawSizeProps,
  DrawTextProps,
  DrawTextStyle,
} from "./drawingPrimitives";

import {
  drawParagraph,
  drawSvgPath,
  getFillPaint,
  getOrBuildParagraph,
  getStrokePaint,
  getTextAlign,
} from "./drawingPrimitives";
import type {
  DrawParagraphStyle,
  DrawSizeProps,
  DrawTextStyle,
} from "./drawingPrimitives";

export function drawText(
  ctx: DrawingContext,
  value: string,
  area: DrawArea,
  position: DrawPosition,
  textStyle: DrawTextStyle = {},
  paraStyle: DrawParagraphStyle = {}
) {
  const {
    maxLines = 1,
    ellipsis = OOO_TEXT,
    textAlign = TextAlign.Left,
    ...para
  } = paraStyle;

  const {
    color = ctx.theme.cellTextColor,
    fontSize = DEFAULT_FONT_SIZE,
    fontFamilies = ["Lato"],
    foregroundPaint,
    backgroundPaint,
    decorationColor,
    backgroundColor,
    foregroundColor,
    ...text
  } = textStyle;

  const buildStyle = (): SkTextStyle => {
    const style: SkTextStyle = {
      ...text,
      fontSize,
      color: Skia.Color(color),
      fontFamilies: [...(fontFamilies || []), defaultFontFamily],
    };
    if (typeof decorationColor !== "undefined")
      style.decorationColor = Skia.Color(decorationColor);
    if (typeof backgroundColor !== "undefined")
      style.backgroundColor = Skia.Color(backgroundColor);
    if (typeof foregroundColor !== "undefined")
      style.foregroundColor = Skia.Color(foregroundColor);
    return style;
  };

  const buildParagraph = () =>
    Skia.ParagraphBuilder.Make(
      {
        ...para,
        maxLines: maxLines ?? undefined,
        ellipsis,
        textAlign,
      },
      ctx.fontManager
    )
      .pushStyle(buildStyle(), foregroundPaint, backgroundPaint)
      .addText(`${value}`)
      .build();

  // Paints are runtime SkPaint objects; can't safely key the cache on them.
  // When either is provided, fall back to the uncached path (same behavior
  // as today, no regression for this less-common case).
  const cacheBypass = foregroundPaint !== undefined || backgroundPaint !== undefined;

  if (cacheBypass) {
    drawParagraph(ctx, buildParagraph(), area, position);
    return;
  }

  // Effective layout width is what `layoutParagraph` uses.
  const paddingLeft = area.padding?.left ?? CELL_PADDING;
  const paddingRight = area.padding?.right ?? CELL_PADDING;
  const layoutWidth = area.width - paddingLeft - paddingRight;

  // Cache key covers every input that affects paragraph layout output.
  // `text` and `para` carry any extra style props spread by callers; they're
  // shallow objects with primitive values, so JSON.stringify is deterministic.
  const key =
    `${value}|${fontSize}|${color}|${layoutWidth}|${textAlign}|` +
    `${maxLines}|${ellipsis}|${(fontFamilies || []).join(",")}|` +
    `${defaultFontFamily}|${decorationColor ?? ""}|` +
    `${backgroundColor ?? ""}|${foregroundColor ?? ""}|` +
    `${JSON.stringify(text)}|${JSON.stringify(para)}`;

  const paragraph = getOrBuildParagraph(key, () => {
    const p = buildParagraph();
    p.layout(layoutWidth);
    return p;
  });

  const vPadding = (area.height - paragraph.getHeight() - 2) / 2;
  paragraph.paint(
    ctx.canvas,
    position.x + paddingLeft,
    position.y + vPadding
  );
}

export function clipCell(
  x: number,
  y: number,
  height: number,
  width: number,
  ctx: DrawingContext,
  cb: (ctx: DrawingContext) => void
) {
  ctx.canvas.save();

  ctx.canvas.clipRect(
    Skia.XYWHRect(x, y, width, height),
    ClipOp.Intersect,
    true
  );

  cb(ctx);

  ctx.canvas.restore();
}

export function drawDataGridCell<T extends Object>(
  args: CellRendererProps<T>,
  ctxBase: DrawingContext
) {
  const {
    width,
    height,
    x,
    y,
    value,
    textColor: color,
    fontSize,
    sortDirection,
    textRight,
    sortIndex,
    isFiltered,
  } = args;

  try {
    clipCell(x, y, height, width, ctxBase, (ctx) => {
      let textWidth = width;
      if (isFiltered) textWidth -= ICON_WIDTH;
      if (sortDirection) textWidth -= ICON_WIDTH;
      if (sortIndex) textWidth -= 2 * CELL_PADDING;

      drawText(
        ctx,
        value,
        { width: textWidth > 0 ? textWidth : 0, height },
        { x, y },
        { fontSize, color },
        getTextAlign(textRight)
      );
    });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log("failed to render cell", (err as any).message);
  }
}

export function renderRowCell<T extends Object>(
  column: SkiaInternalGridColumn<T>,
  args: Omit<CellRendererProps<T>, "value">,
  value: string,
  ctx: DrawingContext
) {
  try {
    const hasCellRender = !!column.cellRenderer;

    if (hasCellRender) {
      clipCell(args.x, args.y, args.height, args.width, ctx, (newCtx) =>
        column.cellRenderer!({ ...args, value, column }, newCtx)
      );
    } else {
      drawDataGridCell({ ...args, value }, ctx);
    }
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log("failed to draw a cell", (err as any).message);
  }
}

function createScopedDrawText(
  ctx: DrawingContext,
  fontSize: number,
  textRight: boolean,
  hw: { height: number; width: number },
  xy: { x: number; y: number },
  textAlignOverride?: TextAlign
) {
  return (
    value: string,
    style: DrawTextStyleList = {},
    location: DrawTextLocation = {}
  ) =>
    drawText(
      ctx,
      value,
      { ...hw, padding: style.padding, ...(location.hw || {}) },
      { ...xy, ...(location.xy || {}) },
      { fontSize, color: ctx.theme.cellTextColor, ...(style.text || {}) },
      {
        ...(textAlignOverride != null
          ? { textAlign: textAlignOverride }
          : getTextAlign(textRight)),
        ...(style.paragraph || {}),
      }
    );
}

export function renderColumn<T extends Object>(
  column: SkiaInternalGridColumn<T>,
  rows: RowNode<T>[],
  ctx: DrawingContext,
  start: number,
  end: number,
  yOffset: number,
  xVal: number,
  rowHeight: number,
  isRowSelected?: (row: RowNode<T>) => 0 | 1 | 2,
  context?: GridContext,
  nodesSelection?: Map<string, 0 | 2 | 1>,
  selectedCellParams?: SelectedCellParams<T>,
  pinnedStatus?: PinnedStatus,
  icons?: GridIcons,
  cellFontSize?: number
) {
  const slicedRows = rows.slice(start, end + 1);
  const fontSize = cellFontSize ?? ROW_FONT_SIZE_DEFAULT;

  for (let idx = 0; idx < slicedRows.length; idx += 1) {
    const row = slicedRows[idx];
    try {
      const [value, baseValue] = getDisplayValue<T>(column, row);
      const selectionState = isRowSelected?.(row) ?? 0;
      const selected =
        selectionState === 1 ? true : selectionState === 0 ? false : undefined;

      const xy = { x: xVal, y: yOffset + idx * rowHeight };
      const hw = { height: rowHeight, width: column.width };
      const textRight = column.alignment === "right";

      const args: Omit<CellRendererProps<T>, "value"> = {
        row,
        context,
        textColor: ctx.theme.cellTextColor,
        fontSize,
        ...hw,
        ...xy,
        textRight,
        selected,
        nodesSelection,
        selectedCellParams,
        pinnedStatus: pinnedStatus ?? "none",
        icons,
        drawText: createScopedDrawText(ctx, fontSize, textRight, hw, xy),
      };

      if (column.redIfNegative) {
        try {
          const numValue = Number(baseValue);
          if (!isNaN(numValue) && numValue < 0)
            args.textColor = ctx.theme.dangerColor;
        } catch {}
      }

      renderRowCell<T>(column, args, value, ctx);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log("failed to render col", column.name, (err as any).message);
    }
  }
}

export function drawResizeIcon(
  x: number,
  y: number,
  height: number,
  color: string,
  ctx: DrawingContext
) {
  drawSvgPath(ctx, {
    path: faLeftRight.icon[4] as unknown as string,
    box: [faLeftRight.icon[0], faLeftRight.icon[1]],
    color,
    x: x + 1.25 * CELL_PADDING,
    y: y + height / 2,
    size: height + CELL_PADDING,
  });
}

export function getSvgIconArgs(
  icons: GridIcons | undefined,
  key: keyof GridIcons,
  baseX = 0,
  baseY = 0
) {
  let icon = icons?.[key] as OverrideIcon;
  if (Array.isArray(icon)) icon = { path: icon[2], box: [icon[0], icon[1]] };

  icon = {
    size: DEFAULT_ICON_SIZE,
    x: 0,
    y: 0,
    ...icon,
    hPlacement: "center",
  };
  icon.x = baseX + (icon.x ?? 0);
  icon.y = baseY + (icon.y ?? 0);

  return icon as DrawSvgPathArgs;
}

type DrawSelectionCheckboxArgs = DrawProps &
  DrawLocationProps &
  DrawSizeProps & {
    icons?: GridIcons;
    isSelected?: boolean;
  };
export function drawSelectionCheckbox(
  ctx: DrawingContext,
  args: DrawSelectionCheckboxArgs
) {
  const { x, y, width, height, isSelected, icons } = args;
  const { xOffset = 0, yOffset = 0 } = args;

  const boxPaint = getFillPaint(ctx, ctx.theme.accentBackgroundColor);
  boxPaint.setBlendMode(BlendMode.SrcOver);

  const innerRect = Skia.XYWHRect(x + xOffset, y + yOffset, BOX_SIZE, BOX_SIZE);

  ctx.canvas.drawRRect(
    Skia.RRectXY(innerRect, BOX_RADIUS, BOX_RADIUS),
    boxPaint
  );

  if (isSelected !== false || typeof icons?.notSelected !== "undefined") {
    const key =
      isSelected === false
        ? "notSelected"
        : isSelected === true
        ? "selected"
        : "partiallySelected";

    drawSvgPath(ctx, getSvgIconArgs(icons, key, x + width / 2, y + height / 2));
  }
}

export function drawResizeCellBackground(
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string,
  ctx: DrawingContext
) {
  const overlayPaint = getFillPaint(ctx, backgroundColor);
  overlayPaint.setAlphaf(0.8);
  ctx.canvas.drawRect(Skia.XYWHRect(x, y, width, height), overlayPaint);
}

export function drawNoData(
  ctx: DrawingContext,
  yOffset: number,
  text = "No Data",
  textColor?: string,
  backgroundColor?: string
) {
  const color = textColor ?? ctx.theme.cellTextColor;
  const bg = backgroundColor ?? ctx.theme.accentBackgroundColor;

  const font = getFont(ctx.fontManager, NO_DATA_FONT_SIZE, "Lato");

  const width = getTextWidth(font, text) || NO_DATA_DEFAULT_WIDTH;

  const y = yOffset + (ctx.height - yOffset) / 3.5;
  const x = ctx.width / 2 - width / 2 - NO_DATA_PADDING;
  const w = width + NO_DATA_PADDING * 2.5;
  const h = NO_DATA_FONT_SIZE + NO_DATA_PADDING * 2.5;

  const strokePaint = getFillPaint(ctx, bg);
  const box = Skia.XYWHRect(x, y, w, h);
  const rBox = Skia.RRectXY(box, NO_DATA_PADDING, NO_DATA_PADDING);

  ctx.canvas.drawRRect(rBox, strokePaint);

  drawText(
    ctx,
    text,
    {
      width: w,
      height: h,
      padding: { left: NO_DATA_PADDING, right: NO_DATA_PADDING },
    },
    { x, y },
    { color, fontSize: NO_DATA_FONT_SIZE },
    { textAlign: TextAlign.Center }
  );
}

type DrawColumnHeaderBackgroundProps<T extends Object> = DrawProps &
  Pick<DrawSizeProps, "width"> &
  ColumnDrawProps<T>;

const gap = 0.5;
export function drawColumnHeaderBackground<T extends Object>(
  props: DrawColumnHeaderBackgroundProps<T>,
  ctx: DrawingContext
) {
  const {
    xOffset = 0,
    width,

    columns,
    headerHeight,
    totalHeaderHeight,
    topRowNodeHeight,
    columnGroupHeaders = [],
    colGroupDepthMap,
  } = props;

  const strokePaint = getFillPaint(ctx, ctx.theme.backgroundColor);
  const borderPaint = getFillPaint(ctx, ctx.theme.borderColor);
  borderPaint.setBlendMode(BlendMode.Overlay);

  ctx.canvas.drawRect(
    Skia.XYWHRect(xOffset, 0, width, totalHeaderHeight),
    strokePaint
  );

  if (topRowNodeHeight) {
    strokePaint.setColor(Skia.Color(ctx.theme.accentBackgroundColor));
    ctx.canvas.drawRect(
      Skia.XYWHRect(xOffset, totalHeaderHeight, width, topRowNodeHeight),
      strokePaint
    );
  }

  ctx.canvas.drawRect(
    Skia.XYWHRect(xOffset, totalHeaderHeight - gap, width, gap),
    borderPaint
  );

  let xVal = xOffset;
  for (let i = 0; i < columns.length; i++) {
    xVal += columns[i].width;
    const colDepth = colGroupDepthMap?.get(columns[i].colId!) ?? 0;
    const colY = colDepth * headerHeight;
    const colH = totalHeaderHeight - colY;
    ctx.canvas.drawRect(
      Skia.XYWHRect(xVal - gap, colY, gap, colH),
      borderPaint
    );
  }

  if (columnGroupHeaders.length > 0) {
    for (const group of columnGroupHeaders) {
      const { groupX, groupWidth } = getGroupGeometry(group, columns, xOffset);
      if (groupWidth > 0) {
        ctx.canvas.drawRect(
          Skia.XYWHRect(
            groupX,
            (group.depth + 1) * headerHeight - gap,
            groupWidth,
            gap
          ),
          borderPaint
        );
      }
    }

    for (const group of columnGroupHeaders) {
      const { groupX, groupWidth } = getGroupGeometry(group, columns, xOffset);
      if (groupWidth > 0) {
        ctx.canvas.drawRect(
          Skia.XYWHRect(
            groupX + groupWidth - gap,
            group.depth * headerHeight,
            gap,
            headerHeight
          ),
          borderPaint
        );
      }
    }
  }
}

type DrawCellBackgroundProps = DrawProps &
  Pick<DrawSizeProps, "width"> & {
    rowsCount: number;
    rowHeight: number;
    fullHeight: number;
  };
export function drawCellBackground(
  props: DrawCellBackgroundProps,
  ctx: DrawingContext
) {
  const {
    xOffset = 0,
    yOffset = 0,
    width,

    rowsCount,
    rowHeight,
    fullHeight,
  } = props;

  const strokePaint = getFillPaint(ctx, ctx.theme.backgroundColor);
  const borderPaint = getFillPaint(ctx, ctx.theme.borderColor);
  borderPaint.setBlendMode(BlendMode.Overlay);

  ctx.canvas.drawRect(
    Skia.XYWHRect(xOffset, yOffset, width, fullHeight),
    strokePaint
  );

  strokePaint.setColor(Skia.Color(ctx.theme.rowAlternateBackgroundColor));

  for (let i = 0; i < rowsCount; i += 2) {
    ctx.canvas.drawRect(
      Skia.XYWHRect(xOffset, i * rowHeight + yOffset, width, rowHeight),
      strokePaint
    );

    ctx.canvas.drawRect(
      Skia.XYWHRect(xOffset, i * rowHeight - gap + yOffset, width, gap),
      borderPaint
    );

    ctx.canvas.drawRect(
      Skia.XYWHRect(xOffset, (i + 1) * rowHeight - gap + yOffset, width, gap),
      borderPaint
    );
  }

  if (!(rowsCount % 2)) {
    ctx.canvas.drawRect(
      Skia.XYWHRect(xOffset, yOffset + fullHeight - gap, width, gap),
      borderPaint
    );
  }
}

type DrawColumnHeaderContentProps<T extends Object> = DrawProps &
  DrawContentProps &
  ColumnDrawProps<T> & {
    sortStatus?: Array<MultiColumnSortStatusEntry> | null;
    filterState: Map<string, ColumnFilterState>;
    topRowNode?: RowNode<T> | null;
    headerSelectionState: 0 | 1 | 2;
    gridIcons: GridIcons;
    cellFontSize?: number;
  };

export function drawColumnHeaderContent<T extends Object>(
  props: DrawColumnHeaderContentProps<T>,
  ctx: DrawingContext
) {
  const {
    xOffset = 0,

    fontSize = HEADER_FONT_SIZE_DEFAULT,
    cellFontSize: cellFontSizeArg,

    columns,
    headerHeight,
    totalHeaderHeight,
    topRowNodeHeight,
    columnGroupHeaders = [],
    colGroupDepthMap,

    sortStatus,
    filterState,
    topRowNode,
    gridIcons,
    headerSelectionState,
  } = props;
  const cellFontSize = cellFontSizeArg ?? ROW_FONT_SIZE_DEFAULT;

  if (columnGroupHeaders.length > 0) {
    for (const group of columnGroupHeaders) {
      const { groupX, groupWidth } = getGroupGeometry(group, columns, xOffset);
      if (groupWidth > 0) {
        const groupY = group.depth * headerHeight;

        clipCell(groupX, groupY, headerHeight, groupWidth, ctx, (clipped) => {
          drawText(
            clipped,
            group.headerName,
            { width: groupWidth, height: headerHeight },
            { x: groupX, y: groupY },
            { fontSize, color: clipped.theme.cellTextColor },
            { textAlign: TextAlign.Center }
          );
        });
      }
    }
  }

  let baseXVal = xOffset;

  const isMultiShort = sortStatus && sortStatus.length > 1;

  for (let i = 0; i < columns.length; i++) {
    const xVal = baseXVal;
    baseXVal += columns[i].width;
    const columnSortDirection = sortStatus?.find(
      (item) => item.columnId === columns[i].__id
    );
    const isFiltered =
      (filterState.get(getFilterKey(columns[i]))?.filterIndex ?? -1) >= 0;
    const isCheckbox = columns[i].headerCheckboxSelection;
    let textWidth = columns[i].width;
    if (isFiltered) textWidth -= ICON_WIDTH;
    if (columnSortDirection) textWidth -= ICON_WIDTH;
    if (isMultiShort) textWidth -= 2 * CELL_PADDING;

    const colDepth = colGroupDepthMap?.get(columns[i].colId!) ?? 0;
    const colHeaderY = colDepth * headerHeight;
    const colHeaderHeight = totalHeaderHeight - colHeaderY;
    const iconCenterY = colHeaderY + colHeaderHeight / 2;
    const xy = { x: xVal, y: colHeaderY };
    const hw = {
      height: colHeaderHeight,
      width: textWidth > 0 ? textWidth : 0,
    };

    drawDataGridCell(
      {
        textColor: ctx.theme.cellTextColor,
        fontSize,
        ...hw,
        ...xy,
        value: columns[i].name,
        textRight: columns[i].alignment === "right",
        drawText: createScopedDrawText(ctx, fontSize, false, hw, xy),
      },
      ctx
    );

    if (isFiltered) {
      let xOffset = CELL_PADDING;
      if (columnSortDirection) xOffset += ICON_WIDTH;
      if (isMultiShort) xOffset += 2 * CELL_PADDING;

      drawSvgPath(ctx, {
        path: faFilter.icon[4] as unknown as string,
        box: [faFilter.icon[0], faFilter.icon[1]],
        color: ctx.theme.cellTextColor,
        x: baseXVal - xOffset,
        y: iconCenterY,
        size: headerHeight,
        hPlacement: "right",
      });
    }

    if (topRowNodeHeight && topRowNode) {
      const [value, baseValue] = getDisplayValue(columns[i], topRowNode);

      const xy = { x: xVal, y: totalHeaderHeight };
      const hw = { height: topRowNodeHeight, width: columns[i].width };
      const textRight = columns[i].alignment === "right";

      const args: CellRendererProps<T> = {
        pinned: true,
        row: topRowNode,
        backgroundColor: ctx.theme.accentBackgroundColor,
        textColor: ctx.theme.cellTextColor,
        fontSize: cellFontSize,
        ...hw,
        ...xy,
        textRight,
        value,
        drawText: createScopedDrawText(ctx, cellFontSize, textRight, hw, xy),
      };

      if (columns[i].redIfNegative) {
        try {
          const numValue = Number(baseValue);
          if (!isNaN(numValue) && numValue < 0)
            args.textColor = ctx.theme.dangerColor;
        } catch {}
      }

      drawDataGridCell(args, ctx);
    }

    if (columnSortDirection) {
      if (columnSortDirection.sort === "asc") {
        drawSvgPath(ctx, {
          path: faSortUp.icon[4] as unknown as string,
          box: [faSortUp.icon[0], faSortUp.icon[1]],
          color: ctx.theme.cellTextColor,
          x: baseXVal - CELL_PADDING,
          y: iconCenterY + headerHeight / 5,
          size: headerHeight,
          hPlacement: "right",
        });
      } else {
        drawSvgPath(ctx, {
          path: faSortDown.icon[4] as unknown as string,
          box: [faSortDown.icon[0], faSortDown.icon[1]],
          color: ctx.theme.cellTextColor,
          x: baseXVal - CELL_PADDING,
          y: iconCenterY - headerHeight / 5,
          size: headerHeight,
          hPlacement: "right",
        });
      }
      if (isMultiShort) {
        drawText(
          ctx,
          (columnSortDirection.sortIndex + 1).toString(),
          {
            height: colHeaderHeight,
            width: columns[i].width,
            padding: getPadding(0),
          },
          { x: baseXVal - ICON_WIDTH - 2 * CELL_PADDING, y: colHeaderY },
          { fontSize, color: ctx.theme.cellTextColor }
        );
      }
    }
    if (isCheckbox) {
      const selectionState =
        headerSelectionState === 1
          ? true
          : headerSelectionState === 0
          ? false
          : undefined;

      drawSelectionCheckbox(ctx, {
        x: 0,
        y: colHeaderY,
        xOffset: BOX_OFFSET,
        yOffset: (colHeaderHeight - BOX_SIZE) / 2,
        width: columns[i].width,
        height: colHeaderHeight,
        icons: { ...gridIcons, ...(columns[i]?.icons ?? {}) },
        isSelected: selectionState,
      });
    }
  }
}

type DrawOverlayRowProps<T extends Object> = DrawProps &
  DrawSizeProps &
  RowDrawProps<T> &
  Omit<DrawLocationProps, "x"> & {
    xCellVal?: number;
  };
export function drawOverlayRow<T extends Object>(
  props: DrawOverlayRowProps<T>,
  ctx: DrawingContext
) {
  const {
    y,
    xOffset = 0,
    yOffset = 0,
    xCellVal = 0,
    width,
    rows,
    height,
    rowSelection,
    pinnedStatus,
    selectedCellParams,
    nodesSelection,
  } = props;

  const strokePaint = getFillPaint(ctx, ctx.theme.accentHoverColor);
  strokePaint.setAlphaf(0.65);

  if (rowSelection === "multiple" && rows?.length) {
    rows.forEach((row) => {
      const yPos = row.__index * height;
      ctx.canvas.drawRect(
        Skia.XYWHRect(xOffset, yPos + yOffset, width, height),
        strokePaint
      );
    });
  } else if (rowSelection === "single") {
    ctx.canvas.drawRect(
      Skia.XYWHRect(xOffset, y + yOffset, width, height),
      strokePaint
    );
  }

  const selectedCellCol = selectedCellParams?.cellEditingParams?.colDef;
  const selectedCellRow = selectedCellParams?.row;
  const haveContent = selectedCellCol && selectedCellRow;
  const haveReason =
    selectedCellParams?.isEditable || selectedCellParams?.cellTooltip;

  if (haveContent && haveReason) {
    const isRowSelected = getIsRowSelected(nodesSelection, selectedCellRow);
    const colPinnedStatus = selectedCellCol.pinned ?? "none";

    if (pinnedStatus === colPinnedStatus) {
      const color = isRowSelected ? ctx.theme.cellTextColor : ctx.theme.accentColor;

      ctx.canvas.drawRect(
        Skia.XYWHRect(xCellVal, y + yOffset, selectedCellCol.width, height),
        getStrokePaint(ctx, color, 2)
      );
    }
  }
}

type DrawSectionOverlayProps = DrawProps &
  DrawSizeProps & {
    headerHeight: number;
    selectedSection: SectionSeparatorKeys;
    isResizing: boolean;
  };
export function drawSectionOverlay(
  args: DrawSectionOverlayProps,
  ctx: DrawingContext
) {
  const { height, xOffset = 0, width, selectedSection } = args;

  const theme = ctx.theme;
  const color = args.isResizing ? theme.backgroundTertiaryColor : theme.accentColor;
  const strokePaint = getFillPaint(ctx, color);
  strokePaint.setAlphaf(0.8);

  ctx.canvas.drawRect(Skia.XYWHRect(xOffset, 0, width, height), strokePaint);

  drawResizeIcon(
    xOffset + (selectedSection === "right" ? 0 : width),
    height / 2,
    args.headerHeight,
    theme.cellTextColor,
    ctx
  );
}

type DrawHeaderOverlayProps = DrawProps &
  DrawSizeProps & {
    columnWidth: number;
    headerHeight: number;
    isResizing: boolean;
    resizeIconSide: SectionSeparatorKeys;
  };
export function drawHeaderOverlay(
  args: DrawHeaderOverlayProps,
  ctx: DrawingContext
) {
  const {
    height,
    headerHeight,
    width,
    columnWidth,
    xOffset = 0,
    yOffset = 0,
  } = args;
  const rightSide = args.resizeIconSide === "right";
  const rx = xOffset + (rightSide ? columnWidth - width : 0); // rect x
  const ix = xOffset + (rightSide ? 0 : width); // icon x

  const theme = ctx.theme;
  const color = args.isResizing ? theme.backgroundTertiaryColor : theme.accentColor;
  const strokePaint = getFillPaint(ctx, color);
  strokePaint.setAlphaf(0.8);

  ctx.canvas.drawRect(Skia.XYWHRect(rx, yOffset, width, height), strokePaint);

  const iy = yOffset + (height - headerHeight) / 2;
  drawResizeIcon(ix, iy, headerHeight, theme.cellTextColor, ctx);
}

type DrawCellContentProps<T extends Object> = DrawProps &
  Pick<DrawSizeProps, "height"> &
  RowDrawProps<T> &
  GridContextProps & {
    columns: SkiaInternalGridColumn<T>[];
    isRowSelected?: (row: RowNode<T>) => 0 | 1 | 2;
    icons: GridIcons;
    cellFontSize?: number;
  };
export function drawCellContent<T extends Object>(
  args: DrawCellContentProps<T>,
  ctx: DrawingContext
) {
  const {
    xOffset = 0,
    yOffset = 0,

    rows,
    height,
    nodesSelection,
    selectedCellParams,
    pinnedStatus,

    columns,
    indexes,
    isRowSelected,
    context,
    icons,
    cellFontSize,
  } = args;

  ctx.canvas.save();
  let xVal = xOffset;

  for (let i = indexes.cols.start; i <= indexes.cols.end; i++) {
    renderColumn(
      columns[i],
      rows,
      ctx,
      indexes.rows.start,
      indexes.rows.end,
      yOffset,
      xVal,
      height,
      isRowSelected,
      context,
      nodesSelection,
      selectedCellParams,
      pinnedStatus,
      icons,
      cellFontSize
    );
    xVal += columns[i].width;
  }
  ctx.canvas.restore();
}

type DrawSectionSeparatorProps = DrawSizeProps & Omit<DrawLocationProps, "y">;
export function drawSectionSeparator(
  args: DrawSectionSeparatorProps,
  ctx: DrawingContext
) {
  const { x, width, height } = args;
  const paint = getFillPaint(ctx, ctx.theme.accentBackgroundColor);
  ctx.canvas.drawRect(Skia.XYWHRect(x, 0, width, height), paint);
}

type DrawEditableCellBackgroundProps = DrawLocationProps &
  DrawSizeProps & {
    selected?: boolean;
  };
export function drawEditableCellBackground(
  args: DrawEditableCellBackgroundProps,
  ctx: DrawingContext
) {
  const { x, y, width, height, selected } = args;
  let paint = getFillPaint(ctx, ctx.theme.mutedTextColor);

  if (selected) {
    paint = getStrokePaint(ctx, ctx.theme.accentBackgroundColor, 1.5);
    paint.setAlphaf(1);
  } else {
    ctx.canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint);
    paint.setColor(Skia.Color(ctx.theme.backgroundHoverColor));
  }

  const innerRect = Skia.XYWHRect(
    x + EDITABLE_CELL_PADDING,
    y + EDITABLE_CELL_PADDING,
    width - 2 * EDITABLE_CELL_PADDING,
    height - 2 * EDITABLE_CELL_PADDING
  );

  ctx.canvas.drawRRect(Skia.RRectXY(innerRect, BOX_RADIUS, BOX_RADIUS), paint);
}

type DrawEditableCellPressOverlayArgs<T extends Object> = DrawLocationProps & {
  selectedCellCol: SkiaInternalGridColumn<T> | null | undefined;
  selectedCellRow: RowNode<T> | null | undefined;
  rowHeight: number;
  pinnedStatus: PinnedStatus | undefined;
};
export function drawEditableCellPressOverlay<T extends Object>(
  args: DrawEditableCellPressOverlayArgs<T>,
  ctx: DrawingContext
) {
  const { selectedCellCol, selectedCellRow, x, y, rowHeight, pinnedStatus } =
    args;
  if (selectedCellCol && selectedCellRow) {
    const colPinnedStatus = selectedCellCol.pinned ?? "none";
    if (pinnedStatus === colPinnedStatus) {
      const innerRect = Skia.XYWHRect(
        x + EDITABLE_CELL_PADDING,
        y + EDITABLE_CELL_PADDING,
        selectedCellCol.width - 2 * EDITABLE_CELL_PADDING,
        rowHeight - 2 * EDITABLE_CELL_PADDING
      );

      ctx.canvas.drawRRect(
        Skia.RRectXY(innerRect, BOX_RADIUS, BOX_RADIUS),
        getStrokePaint(ctx, ctx.theme.accentColor, 2)
      );
    }
  }
}

