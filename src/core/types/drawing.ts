/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: incrementally remove per-line */
import type {
  SkCanvas,
  SkPaint,
  SkTypefaceFontProvider,
} from "@shopify/react-native-skia";

import type { GridTheme } from "../../themes";
import type {
  DrawParagraphStyle,
  DrawTextStyle,
} from "../../renderer/drawing/drawMethods";
import type { HorizontalPlacement, VerticalPlacement } from "./primitives";

export interface DrawingContext {
  canvas: SkCanvas;
  paint: SkPaint;
  width: number;
  height: number;
  fontManager: SkTypefaceFontProvider;
  theme: GridTheme;
}

export type GridCtx = DrawingContext;

export type GridContext = React.MutableRefObject<any>;

export type DrawTextStyleList = {
  text?: DrawTextStyle;
  paragraph?: DrawParagraphStyle;
  padding?: { left: number; right: number };
};

export type DrawTextLocation = {
  hw?: { height?: number; width?: number };
  xy?: { x?: number; y?: number };
};

export type DrawLocationProps = { x: number; y: number };

export type PlacementProps = {
  vPlacement?: VerticalPlacement;
  hPlacement?: HorizontalPlacement;
};

export type DrawSvgPathArgs = DrawLocationProps &
  PlacementProps & {
    path: string;
    box: [number, number];
    color?: string;
    size: number;
  };
