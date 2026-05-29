import type { RowNode } from "../types";
import type { GridEvent } from "../types";

// Rows are the RowManager's output. Column-side events (filter/sort/group
// state change) live in columnEvents.ts — RowManager subscribes to those
// and responds by recomputing the pipeline.

export const RowEventTypes = {
  RowsChanged: "rows:changed",
} as const;

export type RowsChangedEvent<T extends Object = Object> = GridEvent & {
  type: typeof RowEventTypes.RowsChanged;
  rows: RowNode<T>[];
};

export type RowEvent<T extends Object = Object> = RowsChangedEvent<T>;
