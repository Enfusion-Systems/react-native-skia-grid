import type { ColumnChooserColumn } from "./types";

export function createColumnState(columns: Array<ColumnChooserColumn>) {
  return columns.reduce(
    (res, column) => {
      res[0][column.groupName] ??= [];
      if (column.selected) res[0][column.groupName]?.push(column);
      else res[1].push(column);
      return res;
    },
    [{}, []] as [
      Record<string, Array<ColumnChooserColumn>>,
      Array<ColumnChooserColumn>
    ]
  );
}

export function createFilters(
  columns: Array<ColumnChooserColumn>,
  currentValues: Record<string, boolean> = {},
  defaultChecked = true
) {
  return columns.reduce((res, column) => {
    const categories = column.category.split(",");
    categories.forEach((category) => {
      const current = currentValues[category];
      res[category] = typeof current === "boolean" ? current : defaultChecked;
    });
    return res;
  }, {} as Record<string, boolean>);
}

export function createSelectedColumnsOpen(columns: Array<ColumnChooserColumn>) {
  return columns.reduce((res, column) => {
    res[column.groupName] = true;
    return res;
  }, {} as Record<string, boolean>);
}
