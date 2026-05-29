import uniq from "lodash/uniq";

import { getDisplayValue } from "../../utils/gridUtils";
import { getFilteredRows } from "../pipeline/filter";
import type {
  ColumnFilterState,
  RowNode,
  SetFilterType,
  SkiaInternalGridColumn,
} from "../types";

type GetDistinctValuesArgs<T extends Object> = {
  rowsData: RowNode<T>[];
  filterState: Map<string, ColumnFilterState>;
  columns: SkiaInternalGridColumn<T>[];
  selectedColumn: SkiaInternalGridColumn<T>;
  filterKey: string;
  index: number;
};

/**
 * Sorted, unique display values for `selectedColumn`, computed against
 * every filter EXCEPT the one at `(filterKey, index)`. The slice on
 * filters is intentional: when a user is editing a set-filter, the
 * displayed choices should reflect what would be visible WITHOUT their
 * in-progress selection — not after it.
 */
export function getDistinctValuesForColumn<T extends Object>({
  rowsData,
  filterState,
  columns,
  selectedColumn,
  filterKey,
  index,
}: GetDistinctValuesArgs<T>): string[] {
  const colFilterState = filterState.get(filterKey);
  const newFilterState = new Map(filterState);
  if (colFilterState) {
    newFilterState.set(filterKey, {
      ...colFilterState,
      filters: colFilterState.filters.slice(0, index),
    });
  }
  const distinctRows = getFilteredRows(rowsData, newFilterState, columns);
  return uniq(
    distinctRows
      ?.map((rowNode) => getDisplayValue(selectedColumn, rowNode)[0] ?? "")
      .sort()
  );
}

/**
 * Builds a SetFilterType from the user's check selection. When every
 * distinct value is checked, emits the null-shorthand `{ values: null }`
 * (= "no filter active"); otherwise emits the array of checked values.
 */
export function deriveSetFilterValue(
  checkedValues: string[],
  total: number
): SetFilterType {
  return {
    values: checkedValues.length === total ? null : checkedValues,
  };
}
