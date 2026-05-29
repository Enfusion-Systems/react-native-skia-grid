import type { SkiaInternalGridColumn } from "./column";

export type GroupRowNode<T extends Object> = {
  children: RowNode<T>[];
  level: number;
  groupKey?: string;
  expanded?: boolean;
  field?: string;
  rowGroupColumn?: SkiaInternalGridColumn<T> | null;
  rowGroupIndex?: number;
  groupRowData?: Partial<T>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RowNode<T extends Object = any> = {
  id?: string;
  __id: string;
  __index: number;
  data: T;
  group?: boolean;
  pinned?: boolean;
} & GroupRowNode<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RowDataTransaction<T extends Object = any> = {
  // Index to add rows
  addIndex?: number | null;
  // Rows to add
  add?: T[] | null;
  // Rows to remove
  remove?: T[] | null;
  // Rows to update
  update?: T[] | null;
};

export interface RowNodeTransaction<T extends Object> {
  // Row nodes added
  add: RowNode<T>[];
  // Row nodes removed
  remove: RowNode<T>[];
  // Row nodes updated
  update: RowNode<T>[];
}

export type RowGroupOption<T extends Object> = {
  expandAllRows?: boolean;
  shouldExpand?: (node: RowNode<T>) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RowGroupOpenedEvent<T extends Object = any> = {
  node: RowNode<T>;
};
