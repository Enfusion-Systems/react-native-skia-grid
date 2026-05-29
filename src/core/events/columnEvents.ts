import type {
  ColumnFilterState,
  ColumnSection,
  MultiColumnSortStatus,
  SkiaInternalGridColumn,
} from "../types";
import type { GridEvent } from "../types";

// ColumnManager owns column definitions + their derived state (widths, pin,
// visibility, sort, filter, group). Events are granular so subscribers
// (notably RowManager) can short-circuit: e.g. a width change emits only
// ColumnsResized, which RowManager ignores — no wasted pipeline recompute.

export const ColumnEventTypes = {
  // Shape-level change (added/removed columns, reorder, pin, visibility)
  ColumnsChanged: "columns:changed",
  // Width-only change (single-column resize, autosize, section-resize).
  // Separate from ColumnsChanged so row-pipeline consumers can skip it.
  ColumnsResized: "columns:resized",
  // Pipeline-affecting state changes. RowManager subscribes to all three.
  FilterChanged: "columns:filterChanged",
  SortChanged: "columns:sortChanged",
  GroupChanged: "columns:groupChanged",
  // Section widths (left / center / right) — layout concern, not pipeline.
  SectionResized: "section:resized",
} as const;

export type ColumnsChangedEvent<T extends Object = Object> = GridEvent & {
  type: typeof ColumnEventTypes.ColumnsChanged;
  columns: SkiaInternalGridColumn<T>[];
};

export type ColumnsResizedEvent<T extends Object = Object> = GridEvent & {
  type: typeof ColumnEventTypes.ColumnsResized;
  columns: SkiaInternalGridColumn<T>[];
  // __id -> new width for columns whose width changed this tick.
  changedWidths: Record<string, number>;
};

export type FilterChangedEvent = GridEvent & {
  type: typeof ColumnEventTypes.FilterChanged;
  filterState: Map<string, ColumnFilterState>;
};

export type SortChangedEvent = GridEvent & {
  type: typeof ColumnEventTypes.SortChanged;
  sortStatus?: MultiColumnSortStatus;
};

export type GroupChangedEvent<T extends Object = Object> = GridEvent & {
  type: typeof ColumnEventTypes.GroupChanged;
  groupedColumns: SkiaInternalGridColumn<T>[];
};

export type SectionResizedEvent = GridEvent & {
  type: typeof ColumnEventTypes.SectionResized;
  sectionWidths: Record<ColumnSection, number>;
};

export type ColumnEvent<T extends Object = Object> =
  | ColumnsChangedEvent<T>
  | ColumnsResizedEvent<T>
  | FilterChangedEvent
  | SortChangedEvent
  | GroupChangedEvent<T>
  | SectionResizedEvent;
