import { get, set } from "lodash";

import type {
  AggFunc,
  MultiColumnSortStatus,
  RowNode,
  SkiaInternalGridColumn,
} from "../types";
import { GROUP_COLUMN_ID, GROUP_KEY_SEPARATOR } from "../../utils/constants";
import { getParentRowNodeKeys } from "../../utils/gridUtils";
import { sortRows } from "./sort";

const EMPTY_KEY = "__Blank__";

function createGroupRowNode<T extends Object>(
  key: string,
  value: string,
  level: number,
  column: SkiaInternalGridColumn<T>,
  childNodes?: RowNode<T>[]
) {
  return {
    id: key,
    __index: -1,
    __id: key,
    groupRowData: { [column.field]: value !== EMPTY_KEY ? value : "" },
    group: true,
    groupKey: key,
    expanded: false,
    level: level,
    rowGroupColumn: column,
    rowGroupIndex: column.rowGroupIndex,
    field: column.field,
    children:
      childNodes?.map((child) => ({ ...child, level: level + 1 })) ?? [],
  } as RowNode<T>;
}

function generateKeys<T extends Object>(
  rows: RowNode<T>[],
  cols: SkiaInternalGridColumn<T>[]
) {
  return rows.reduce<Record<string, RowNode<T>>>((res, row) => {
    const parentKeys = getParentRowNodeKeys(row, cols);
    parentKeys.forEach((key, idx) => {
      const value = key.split(GROUP_KEY_SEPARATOR).pop() ?? "";
      if (!res[key]) res[key] = createGroupRowNode(key, value, idx, cols[idx]);
      if (idx === parentKeys.length - 1) res[key]?.children.push(row);
    });
    return res;
  }, {});
}

function getHierarchicalNode<T extends Object>(
  keys: string[],
  data: Record<string, RowNode<T>>
) {
  const sortedKeys = keys?.sort((a, b) => b.length - a.length);
  const nodes = sortedKeys.reduce<RowNode<T>>((res, key) => {
    if (!key.includes(GROUP_KEY_SEPARATOR)) {
      res = data[key];
    } else {
      const parentKey = key.substring(0, key.lastIndexOf(GROUP_KEY_SEPARATOR));
      if (data[parentKey] && data[key]) {
        data[parentKey].children.push(data[key]);
      }
    }

    return res;
  }, {} as RowNode<T>);
  return nodes;
}

function getRowNodes<T extends Object>(data: Record<string, RowNode<T>>) {
  const keys = Object.keys(data);
  const filteredKeys = Object.keys(data).filter(
    (key) => !key.includes(GROUP_KEY_SEPARATOR)
  );
  //root row
  const groupedRows = filteredKeys.reduce<Record<string, RowNode<T>>>(
    (res, key, idx) => {
      if (!res[key]) {
        const childKeys = keys.filter((x) =>
          x.startsWith(`${key}${GROUP_KEY_SEPARATOR}`)
        );
        if (childKeys.length) {
          res[key] = {
            ...getHierarchicalNode([...childKeys, key], data),
            __index: idx,
          };
        } else if (data[key]) {
          res[key] = { ...data[key], __index: idx };
        }
      }
      return res;
    },
    {}
  );
  return Object.values(groupedRows);
}

function getGroupRowData<T extends Object>(
  groupedRowNodes: RowNode<T>[],
  cols: SkiaInternalGridColumn<T>[],
  leafNodeLevel: number,
  aggFuncs?: Record<string, AggFunc<T>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any
) {
  const rowNodes = [...groupedRowNodes];

  return rowNodes.map((rowNode) => {
    if (rowNode.level < leafNodeLevel - 1) {
      getGroupRowData(rowNode.children, cols, leafNodeLevel, aggFuncs, context);
    }

    cols.forEach((colDef) => {
      if (!colDef.hide && colDef.__id !== GROUP_COLUMN_ID) {
        const value =
          aggFuncs?.[colDef.aggFunc ?? ""]?.({ rowNode, colDef, context }) ??
          get(rowNode.groupRowData, colDef.field) ??
          "";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(rowNode.groupRowData ?? {}, colDef.field, value);
      }
    });
    return rowNode;
  });
}

function groupRowsCore<T extends Object>(
  rows: RowNode<T>[],
  cols: SkiaInternalGridColumn<T>[]
) {
  const groupedRowData = generateKeys(rows, cols);
  return getRowNodes(groupedRowData);
}

export function groupRows<T extends Object>(
  renderedRows: RowNode<T>[],
  rowsData: RowNode<T>[],
  groupedColumns: SkiaInternalGridColumn<T>[],
  columns: SkiaInternalGridColumn<T>[],
  sortStatus?: MultiColumnSortStatus,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any,
  aggFuncs?: Record<string, AggFunc<T>>
) {
  let resultRows = [...rowsData];
  let groupedRows = groupRowsCore(resultRows, groupedColumns);

  groupedRows = getGroupRowData(
    groupedRows,
    columns,
    groupedColumns.length,
    aggFuncs,
    context
  );

  const sortedGroupedRows = sortRows(groupedRows, columns, sortStatus, 0);

  const expandedGroupedRows = renderedRows.filter((x) => x.group && x.expanded);

  resultRows = expandedGroupedRows?.length
    ? expandRows(sortedGroupedRows, expandedGroupedRows, columns, sortStatus)
    : sortedGroupedRows;
  return resultRows;
}

export const expandRows = <T extends Object>(
  rows: RowNode<T>[],
  expandedRows: RowNode<T>[],
  columns: SkiaInternalGridColumn<T>[],
  sortStatus?: MultiColumnSortStatus,
  finalRows?: RowNode<T>[]
) => {
  const result = rows.reduce<RowNode<T>[]>((res, row) => {
    if (row.group) {
      const selectedRow = expandedRows?.find(
        (x) => x.groupKey === (row.groupKey ?? "")
      );
      if (selectedRow?.expanded) {
        res.push({ ...row, expanded: true, __index: res.length });
        const sortedChildren = sortRows(
          row.children,
          columns,
          sortStatus,
          row.level + 1
        );

        const childNodes = sortedChildren.map((child) => ({
          ...child,
          groupKey:
            child.groupKey ??
            `${row.groupKey}${GROUP_KEY_SEPARATOR}${child.id}`,
        }));
        res = expandRows(childNodes, expandedRows, columns, sortStatus, res);
        return res;
      }
    }
    res.push({ ...row, __index: res.length });
    return res;
  }, finalRows ?? ([] as RowNode<T>[]));
  return result;
};
