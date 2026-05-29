import type { ValueFormatterArgs } from "./cell";

export type SortDir = null | "asc" | "desc";

export type SortOrder = Array<SortDir>;

export type SortStatus = [string, SortDir] | null;

export type MultiColumnSortStatusEntry = {
  columnId: string;
  sort: SortDir;
  sortIndex: number;
};

export type MultiColumnSortStatus = Array<MultiColumnSortStatusEntry> | null;

export type ColumnSort =
  | Array<{ columnName: string; ascending: boolean }>
  | null
  | undefined;

export type SortValueGetter<T extends Object> = (
  args: ValueFormatterArgs<T>
) => string | number;
