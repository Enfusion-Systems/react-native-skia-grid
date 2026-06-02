export type ColumnSection = "left" | "center" | "right";

export type ColumnAlignment = "left" | "right" | null;

export type ColumnPinnedType = "left" | "right" | boolean | null | undefined;

export type PinActionsType = "left" | "right" | null;

export type SectionSeparatorKeys = "left" | "right";

export type RowSelectionMode = "single" | "multiple";

export type HorizontalPlacement = "center" | "left" | "right";
export type VerticalPlacement = "center" | "top" | "bottom";

// `groupId` is a stable identity for a group NODE in the column-def tree (its
// full ancestor chain), so two sibling groups that happen to share a headerName
// at the same depth under different parents are not treated as the same group.
// Optional: hand-built paths (tests/external callers) may omit it, in which
// case consumers fall back to headerName+depth.
export type ColumnGroupPath = {
  headerName: string;
  depth: number;
  groupId?: string;
}[];

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
