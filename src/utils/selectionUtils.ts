import type { RowNode } from "../core/types";

type SS = 0 | 1 | 2;

export function getIsRowSelected(
  nodesSelection: Map<string, SS>,
  row: RowNode
) {
  return (
    (nodesSelection.has(row.__id) && nodesSelection.get(row.__id) !== 0) ||
    (row.children.length > 0 &&
      row.children.every(
        (c) => nodesSelection.has(c.__id) && nodesSelection.get(c.__id) !== 0
      ))
  );
}

export const getFolderCalculatedCheckedState = <T extends Object>(
  rows: RowNode<T>[],
  map: Map<string, SS>
): SS | null => {
  let state: SS | null = null;
  for (const e of rows) {
    const curr = e.group
      ? getFolderCalculatedCheckedState(e.children, map)
      : map.get(e.__id) ?? 0;

    state ??= curr;
    if (state === 2) break;
    if (state === curr) continue;
    // diff so partial
    state = 2;
    break;
  }
  return state ?? 0;
};

export const updateLeafNodeSelectionState = <T extends Object>(
  row: RowNode<T>,
  map: Map<string, SS>,
  selectionState: 0 | 1
) => {
  return row.children?.reduce((res, node) => {
    if (node.children?.length) {
      updateLeafNodeSelectionState(node, map, selectionState);
    } else {
      res.set(node.__id, selectionState);
    }
    return res;
  }, map);
};

export const getSelectedRows = (rows: RowNode[], newMap: Map<string, SS>) => {
  return rows.reduce((acc: RowNode[], row) => {
    if (row.children.length > 0) {
      acc = [...acc, ...getSelectedRows(row.children, newMap)];
    } else {
      if (newMap.get(row.__id) === 1 && !acc.some((a) => a.__id === row.__id)) {
        acc.push(row);
      }
    }
    return acc;
  }, []);
};
