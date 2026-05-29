import type { SkFont } from "@shopify/react-native-skia";
import { sortBy } from "lodash";
import * as React from "react";

import type {
  ApplyColumnStateParams,
  ColumnFilterState,
  EngineHost,
  RowDataTransaction,
  RowNode,
  SkiaGridAPI,
  SkiaGridColumn,
  SkiaGridCoreAPI,
  SkiaInternalGridColumn,
} from "../core/types";
import { useRefCallback } from "../internal/hooks";
import { ColumnManager } from "../core/managers/ColumnManager";
import {
  RowCommandTypes,
  RowManager,
  type RowManagerCommand,
} from "../core/managers/RowManager";
import {
  applyGridTransaction,
  getFolderCalculatedCheckedState,
  getParentRowNodeKeys,
  getSelectedRows,
  mapToInternalColumns,
  transformDataToRowNode,
} from "../utils/gridUtils";
// Inputs the controller needs from the host component. Most of these are
// just refs / setters / props that already exist in DataGrid — the controller
// captures them so the API method bodies can move out of the render body.
export type UseGridControllerDeps<T extends Object> = {
  // managers
  engine: EngineHost;
  rowManager: RowManager<T>;
  columnManager: ColumnManager<T>;
  // reactive state
  rows: RowNode<T>[];
  columns: SkiaInternalGridColumn<T>[];
  nodesSelection: Map<string, 0 | 1 | 2>;
  rowHeight: number;
  fullHeight: number;
  // setters
  setColumns: (cols: SkiaInternalGridColumn<T>[]) => void;
  setSelectedColumn: React.Dispatch<
    React.SetStateAction<SkiaInternalGridColumn<T> | null>
  >;
  setNodesSelection: React.Dispatch<
    React.SetStateAction<Map<string, 0 | 1 | 2>>
  >;
  setTopRowNode: React.Dispatch<React.SetStateAction<RowNode<T> | null>>;
  // refs
  rowsDataRef: React.MutableRefObject<RowNode<T>[]>;
  gridCoreApiRef: React.MutableRefObject<SkiaGridCoreAPI | null>;
  // user props
  getRowId?: (rowData: T) => string;
  defaultColumnDefs?: Partial<SkiaGridColumn<T>>;
  columnTypes?: Record<string, Partial<SkiaGridColumn<T>>>;
  onColumnChange?: () => void;
  onSelectionChanged?: (rows: RowNode<T>[]) => void;
  onRowsUpdated?: (delta: {
    add: RowNode<T>[];
    update: RowNode<T>[];
    remove: RowNode<T>[];
  }) => void;
  // font for transaction-driven width recalc
  font: SkFont;
  // callbacks defined outside the controller region but exposed on the API
  setFilterState: (filterState: Map<string, ColumnFilterState>) => void;
  rebuildRows?: () => void;
  setRowExpandedState: SkiaGridAPI<T>["setRowExpandedState"];
  updateRowSelectionState: SkiaGridAPI<T>["updateRowSelectionState"];
  deselectAll: SkiaGridAPI<T>["deselectAll"];
  updateColumnWidthCache: (
    updateWidths: Record<string, number>[],
    removeWidths: Record<string, number>[]
  ) => void;
};

// Owns the body of the imperative `SkiaGridAPI<T>`. Lives outside DataGrid so
// the ~180 lines of method definitions don't crowd the render body. DataGrid
// still owns `useImperativeHandle` (the correct exit point); this hook is
// just where the API body lives. Pattern matches react-hook-form's `useForm`
// and react-aria's `useListState`.
export function useGridController<T extends Object>(
  deps: UseGridControllerDeps<T>
): SkiaGridAPI<T> {
  const {
    engine,
    rowManager,
    rows,
    columns,
    nodesSelection,
    rowHeight,
    fullHeight,
    setColumns,
    setSelectedColumn,
    setNodesSelection,
    setTopRowNode,
    rowsDataRef,
    columnManager,
    gridCoreApiRef,
    getRowId,
    defaultColumnDefs,
    columnTypes,
    onColumnChange,
    onSelectionChanged,
    onRowsUpdated,
    font,
    setFilterState,
    rebuildRows,
    setRowExpandedState,
    updateRowSelectionState,
    deselectAll,
    updateColumnWidthCache,
  } = deps;

  const updateRowsData = useRefCallback(
    (
      newRows: RowNode<T>[],
      add: RowNode<T>[],
      update: RowNode<T>[],
      remove: RowNode<T>[]
    ) => {
      rowsDataRef.current = newRows;
      engine.dispatch({
        type: RowCommandTypes.SetRows,
        rows: newRows,
      } as RowManagerCommand<T>);

      if (remove.length) {
        const newMap = new Map(nodesSelection);
        remove.forEach((row) => {
          if (newMap.has(row.__id)) newMap.delete(row.__id);
        });
        setNodesSelection(newMap);
        const selectedRows = getSelectedRows(rows, newMap);
        onSelectionChanged?.(selectedRows);
      }
      onRowsUpdated?.({ add, update, remove });
    },
    [engine, nodesSelection, setNodesSelection]
  );

  const setRowsInternal = useRefCallback(
    (rowsInput: T[]) => {
      const newRows = transformDataToRowNode(rowsInput, getRowId);
      rowsDataRef.current = newRows;
      engine.dispatch({
        type: RowCommandTypes.SetRows,
        rows: newRows,
      } as RowManagerCommand<T>);
      setNodesSelection(new Map());
    },
    [engine, rowsDataRef, getRowId, setNodesSelection]
  );

  const applyTransaction = useRefCallback(
    (transaction: RowDataTransaction<T> | RowDataTransaction<T>[]) => {
      applyGridTransaction(
        transaction,
        rowsDataRef.current,
        updateRowsData,
        getRowId,
        columns,
        font,
        updateColumnWidthCache
      );
    },
    [getRowId, rowsDataRef, columns, font, updateColumnWidthCache]
  );

  const updateColumn = useRefCallback(
    (id: string, def: SkiaGridColumn<T>) => {
      const colIdx = columns.findIndex((i) => i.id === id);
      if (colIdx === -1) return columns;
      const newState = [...columns];
      newState[colIdx] = { ...newState[colIdx], ...def };
      setColumns(newState);
      onColumnChange?.();
      rebuildRows?.();
    },
    [columns]
  );

  const setColumnsInternal = useRefCallback(
    (newColumns: SkiaGridColumn<T>[]) => {
      const newColumnsState = mapToInternalColumns(
        newColumns,
        defaultColumnDefs,
        columnTypes
      );
      setColumns(newColumnsState);
      rebuildRows?.();
    },
    [defaultColumnDefs, columnTypes]
  );

  const getColumnState = useRefCallback(
    () => columnManager.getColumns(),
    [columnManager]
  );

  const clearRows = useRefCallback(() => {
    rowsDataRef.current = [];
    engine.dispatch({
      type: RowCommandTypes.SetRows,
      rows: [],
    } as RowManagerCommand<T>);
    setSelectedColumn(null);
  }, [engine, rowsDataRef]);

  const getSelectedNodes = useRefCallback(() => {
    const selectedRows = rows.filter((row) =>
      row.group
        ? getFolderCalculatedCheckedState(row.children, nodesSelection) === 1
        : nodesSelection.get(row.__id) === 1
    );
    return selectedRows;
  }, [nodesSelection, rows]);

  const getVisibleRows = useRefCallback(() => rows, [rows]);

  const setPinnedTopRow = useRefCallback((data: T | null) => {
    setTopRowNode(
      data === null ? null : transformDataToRowNode([data], getRowId)[0]
    );
  }, []);

  const ensureRowVisible = useRefCallback(
    (row: RowNode<T>) => {
      const isRowVisible = () => {
        const index = rows.findIndex((node) => node.__id === row.__id);
        if (index !== -1) {
          gridCoreApiRef.current?.scrollToRowIndex(index);
          return true;
        } else return false;
      };

      if (!isRowVisible()) {
        const groupedColumns = sortBy(
          columns.filter((col) => col.rowGroup),
          (c) => c.rowGroupIndex
        );
        if (groupedColumns?.length) {
          const parentKeys = getParentRowNodeKeys(row, groupedColumns);
          const parentRow = rows.find((i) => parentKeys?.[0] === i.groupKey);
          if (parentRow) {
            const rowsToExpand = parentKeys.slice(0);
            setRowExpandedState(parentRow, true, {
              shouldExpand: (i: RowNode<T>) =>
                rowsToExpand.includes(i.groupKey ?? i.__id),
            });
            setTimeout(() => {
              isRowVisible();
            }, 50);
          }
        }
      }
    },
    [fullHeight, rowHeight, rows, columns, gridCoreApiRef.current]
  );

  const forEachNodeAfterFilter = useRefCallback(
    (callback: (node: RowNode<T>) => void) => {
      rowManager.getFilteredRows().forEach((row) => callback(row));
    },
    [rowManager]
  );

  const forEachNode = useRefCallback(
    (callback: (node: RowNode<T>) => void) => {
      rowsDataRef.current.forEach((row) => callback(row));
    },
    [rowsDataRef]
  );

  const applyColumnState = useRefCallback(
    (args: ApplyColumnStateParams<T>) => {
      const { state, applyOrder } = args;

      let colDefs = applyOrder && state ? [...state] : [...columns];

      const selectionCol = columns.find((col) => col.checkboxSelection);

      setColumns(
        (selectionCol
          ? [selectionCol, ...colDefs]
          : colDefs) as SkiaInternalGridColumn<T>[]
      );

      rebuildRows?.();
      onColumnChange?.();
    },
    [columns]
  );

  return {
    ...gridCoreApiRef.current,
    applyTransaction,
    setPinnedTopRow,
    setRowsData: setRowsInternal,
    setFilters: setFilterState,
    setColumns: setColumnsInternal,
    getColumnState,
    updateColumn,
    clearRows,
    rebuildRows,
    getSelectedNodes,
    setRowExpandedState,
    getVisibleRows,
    ensureRowVisible,
    forEachNodeAfterFilter,
    forEachNode,
    applyColumnState,
    deselectAll,
    updateRowSelectionState,
  } as SkiaGridAPI<T>;
}
