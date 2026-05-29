import {
  type Color,
  type SkPaint,
  type SkParagraph,
  type SkParagraphStyle,
  type SkPath,
  type SkTextStyle,
  PaintStyle,
  Skia,
  TextAlign,
} from "@shopify/react-native-skia";

import type {
  DrawingContext,
  DrawSvgPathArgs,
} from "../../core/types";
import { CELL_PADDING, getPadding } from "../../utils/constants";

type DrawArea = {
  width: number;
  height: number;
  padding?: { left: number; right: number };
};

type DrawPosition = { x: number; y: number };

export type DrawSizeProps = {
  width: number;
  height: number;
};

type DrawContentProps = {
  fontSize?: number;
};

export type DrawTextProps = DrawContentProps & {
  textColor: string;
  textRight?: boolean;
};

export type DrawTextStyle = Omit<
  SkTextStyle,
  "color" | "decorationColor" | "backgroundColor" | "foregroundColor"
> & {
  color?: Color;
  foregroundPaint?: SkPaint;
  backgroundPaint?: SkPaint;
  decorationColor?: Color;
};

export type DrawParagraphStyle = Omit<SkParagraphStyle, "maxLines"> & {
  maxLines?: number | null;
};

export function getFillPaint(ctx: DrawingContext, color: string) {
  const paint = ctx.paint.copy();
  paint.setStyle(PaintStyle.Fill);
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  return paint;
}

export function getStrokePaint(
  ctx: DrawingContext,
  color: string,
  width: number
) {
  const paint = ctx.paint.copy();
  paint.setStyle(PaintStyle.Stroke);
  paint.setColor(Skia.Color(color));
  paint.setStrokeWidth(width);
  return paint;
}

// SVG paths from FA icons are immutable strings reused across every header
// redraw. `Skia.Path.MakeFromSVGString` is non-trivial; caching by path string
// avoids rebuilding the SkPath every frame.
const svgPathCache = new Map<string, SkPath>();

export function getCachedSvgPath(svg: string): SkPath | null {
  const cached = svgPathCache.get(svg);
  if (cached !== undefined) return cached;
  const built = Skia.Path.MakeFromSVGString(svg);
  if (built) svgPathCache.set(svg, built);
  return built ?? null;
}

export function clearSvgPathCache(): void {
  svgPathCache.clear();
}

export function drawSvgPath(
  ctx: DrawingContext,
  args: DrawSvgPathArgs & { save?: boolean }
) {
  const { hPlacement = "right", vPlacement = "center", save = true } = args;
  const { box, x, y, size, color = ctx.theme.cellTextColor } = args;

  const paint = getFillPaint(ctx, color);

  const path = getCachedSvgPath(args.path);
  let iconWidth = 0;
  let iconHeight = 0;

  if (path) {
    if (save) ctx.canvas.save();

    const scale = (size / box[0]) * 0.5;
    iconWidth = box[0] * scale;
    iconHeight = box[1] * scale;

    let xO = 0;
    if (hPlacement === "center") xO = iconWidth / 2;
    if (hPlacement === "right") xO = iconWidth;

    let yO = 0;
    if (vPlacement === "center") yO = iconHeight / 2;
    if (vPlacement === "bottom") yO = iconHeight;

    // position the icon
    ctx.canvas.translate(x - xO, y - yO);
    ctx.canvas.scale(scale, scale);

    ctx.canvas.drawPath(path, paint);

    if (save) ctx.canvas.restore();
  }

  return [iconWidth, iconHeight];
}

export function layoutParagraph(
  p: SkParagraph,
  area: DrawArea,
  position: DrawPosition
) {
  const { width, height, padding = getPadding(CELL_PADDING) } = area;
  const availableWidth = width - padding.left - padding.right;

  p.layout(availableWidth);

  const vPadding = (height - p.getHeight() - 2) / 2;

  return {
    x: position.x + padding.left,
    y: position.y + vPadding,
  };
}

export function drawParagraph(
  ctx: DrawingContext,
  p: SkParagraph,
  area: DrawArea,
  position: DrawPosition
) {
  const { x, y } = layoutParagraph(p, area, position);
  p.paint(ctx.canvas, x, y);
}

export function getTextAlign(textRight?: boolean) {
  return { textAlign: textRight ? TextAlign.Right : TextAlign.Left };
}

// ─── Paragraph layout cache ──────────────────────────────────────────────────
// Skia `ParagraphBuilder.build()` + `paragraph.layout(width)` are expensive and
// dominate per-cell draw time. Both are deterministic for a given key, so
// caching the resulting already-laid-out SkParagraph lets us reuse it across
// cells with identical (text, style, width). Painting at different positions
// is always safe — `paragraph.paint(canvas, x, y)` accepts coords.
//
// The Map-based LRU uses insertion order as usage order: on hit we delete +
// re-insert to move to the MRU end; on overflow we evict the oldest entry.

const PARAGRAPH_CACHE_MAX = 2000;
const paragraphCache = new Map<string, SkParagraph>();

function paragraphLruGet(key: string): SkParagraph | undefined {
  const value = paragraphCache.get(key);
  if (value === undefined) return undefined;
  paragraphCache.delete(key);
  paragraphCache.set(key, value);
  return value;
}

function paragraphLruSet(key: string, value: SkParagraph): void {
  if (paragraphCache.has(key)) paragraphCache.delete(key);
  paragraphCache.set(key, value);
  if (paragraphCache.size > PARAGRAPH_CACHE_MAX) {
    const oldest = paragraphCache.keys().next().value;
    if (oldest !== undefined) paragraphCache.delete(oldest);
  }
}

/**
 * Return a cached laid-out `SkParagraph` for the given key, or build + lay
 * out a new one via `build` and cache it. Caller must compute the key to
 * capture every input that affects layout (text, font params, effective
 * width, align, maxLines, ellipsis, extra style props).
 */
export function getOrBuildParagraph(
  key: string,
  build: () => SkParagraph
): SkParagraph {
  const cached = paragraphLruGet(key);
  if (cached !== undefined) return cached;
  const paragraph = build();
  paragraphLruSet(key, paragraph);
  return paragraph;
}

/**
 * Clear the paragraph cache. Call from tests or when `fontManager` /
 * rendering context is swapped.
 */
export function clearParagraphCache(): void {
  paragraphCache.clear();
}

export function drawDashedLine(
  ctx: DrawingContext,
  x: number,
  endX: number,
  y: number,
  dashWidth: number,
  gapWidth: number,
  paint: SkPaint,
  lineHeight = 1
) {
  for (let i = x; i < endX; i += dashWidth + gapWidth) {
    ctx.canvas.drawRect(Skia.XYWHRect(i, y, dashWidth, lineHeight), paint);
  }
}
