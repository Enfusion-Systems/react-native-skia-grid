import type { DrawSvgPathArgs } from "./drawing";

export type GridIconType = "selected" | "notSelected" | "partiallySelected";

export type OverrideIcon =
  | [number, number, string]
  | (Partial<DrawSvgPathArgs> & {
      path: DrawSvgPathArgs["path"];
      box: DrawSvgPathArgs["box"];
    });

export type GridIcons = Partial<Record<GridIconType, OverrideIcon>>;
