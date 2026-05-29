import { get, isEqual, sortBy } from "lodash";

import type {
  MultiColumnSortStatus,
  RowNode,
  SkiaInternalGridColumn,
} from "../types";
import { getColumnValue } from "../../utils/gridUtils";

const getRowValue = <T extends Object>(
  row: RowNode<T>,
  column: SkiaInternalGridColumn<T>
) =>
  column.rowGroup
    ? get(row.groupRowData, column.field) ?? ""
    : column.sortValueGetter
    ? column.sortValueGetter({
        row,
        column,
        value: getColumnValue(row, column),
      })
    : getColumnValue(row, column);

export function sortRows<T extends Object>(
  rows: RowNode<T>[],
  columns: SkiaInternalGridColumn<T>[],
  sortStatus?: MultiColumnSortStatus,
  level?: number
) {
  if (!sortStatus || sortStatus.length === 0) return rows;
  const sortDirs = sortBy(sortStatus, ["sortIndex"]);
  return [...rows].sort((rowA: RowNode<T>, rowB: RowNode<T>) => {
    for (const item of sortDirs) {
      const column = columns.find((i) => i.__id === item?.columnId);
      if (!column) continue;
      if (column.rowGroup && column.rowGroupIndex !== level) continue;

      const a = getRowValue(rowA, column);
      const b = getRowValue(rowB, column);

      const multiplier = item.sort === "desc" ? 1 : -1;

      const notValidOptions = [undefined, null, "NaN"];
      const aNotValid = notValidOptions.includes(a);
      const bNotValid = notValidOptions.includes(b);

      if (aNotValid) return bNotValid ? 0 : multiplier * 1;
      if (bNotValid) return aNotValid ? 0 : multiplier * -1;

      const valueA = column.sortByAbsoluteValue ? Math.abs(a) : a;
      const valueB = column.sortByAbsoluteValue ? Math.abs(b) : b;

      if (!isEqual(a, b)) return multiplier * (valueA < valueB ? 1 : -1);
    }
    return 0;
  });
}
