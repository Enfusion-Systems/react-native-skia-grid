export type ColumnSection = "left" | "center" | "right";

export type ColumnAlignment = "left" | "right" | null;

export type ColumnPinnedType = "left" | "right" | boolean | null | undefined;

export type PinActionsType = "left" | "right" | null;

export type SectionSeparatorKeys = "left" | "right";

export type RowSelectionMode = "single" | "multiple";

export type HorizontalPlacement = "center" | "left" | "right";
export type VerticalPlacement = "center" | "top" | "bottom";

export type ColumnGroupPath = { headerName: string; depth: number }[];

export type ColumnGroupHeader = {
  headerName: string;
  depth: number;
  startColIndex: number;
  colSpan: number;
};

export type GridContentIndexes = {
  cols: { start: number; end: number };
  rows: { start: number; end: number };
};

export type SkiaGridTapLocation = {
  x: number;
  y: number;
  width: number;
  height: number;
  absoluteX: number;
  absoluteY: number;
};
