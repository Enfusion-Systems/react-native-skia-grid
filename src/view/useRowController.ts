import type { SkFont } from "@shopify/react-native-skia";
import { sortBy } from "lodash";
import * as React from "react";

import type {
  EngineHost,
  RowDataTransaction,
  RowNode,
  SkiaGridAPI,
  SkiaGridCoreAPI,
  SkiaGridProps,
  SkiaInternalGridColumn,
} from "../core/types";
import { useRefCallback } from "../internal/hooks";
import {
  RowCommandTypes,
  RowManager,
  type RowManagerCommand,
} from "../core/managers/RowManager";
import {
  SelectionCommandTypes,
  SelectionManager,
  type SelectionCommand,
} from "../core/managers/SelectionManager";
import {
  applyGridTransaction,
  getFolderCalculatedCheckedState,
  getParentRowNodeKeys,
  getSelectedRows,
  transformDataToRowNode,
} from "../utils/gridUtils";

// Inputs the row facade needs. All already exist in DataGrid (managers, the
// reactive rows/selection snapshots, refs, setters, user props) — the controller
// captures them so every row/selection OPERATION lives in one place.
export type UseRowControllerDeps<T extends Object> = {
  engine: EngineHost;
  rowManager: RowManager<T>;
  selectionManager: SelectionManager<T>;
  // reactive state
  rows: RowNode<T>[];
  columns: SkiaInternalGridColumn<T>[];
  nodesSelection: Map<string, 0 | 1 | 2>;
  // refs
  rowsDataRef: React.MutableRefObject<RowNode<T>[]>;
  gridCoreApiRef: React.MutableRefObject<SkiaGridCoreAPI | null>;
  // setters
  setTopRowNode: React.Dispatch<React.SetStateAction<RowNode<T> | null>>;
  setSelectedColumn: React.Dispatch<
    React.SetStateAction<SkiaInternalGridColumn<T> | null>
  >;
  // user props / callbacks
  getRowId?: (rowData: T) => string;
  onSelectionChanged?: (rows: RowNode<T>[]) => void;
  onRowsUpdated?: (delta: {
    add: RowNode<T>[];
    update: RowNode<T>[];
    remove: RowNode<T>[];
  }) => void;
  onRowGroupOpened?: SkiaGridProps<T>["onRowGroupOpened"];
  // font + width cache for transaction-driven width recalc
  font: SkFont;
  updateColumnWidthCache: (
    updateWidths: Record<string, number>[],
    removeWidths: Record<string, number>[]
  ) => void;
};

export type RowController<T extends Object> = {
  // Selection
  setNodesSelection: React.Dispatch<
    React.SetStateAction<Map<string, 0 | 1 | 2>>
  >;
  updateRowNodeSelection: (row: RowNode<T>) => void;
  updateRowSelectionState: SkiaGridAPI<T>["updateRowSelectionState"];
  deselectAll: SkiaGridAPI<T>["deselectAll"];
  toggleAllSelection: () => void;
  getSelectedNodes: () => RowNode<T>[];
  // Row pipeline
  setRowExpandedState: SkiaGridAPI<T>["setRowExpandedState"];
  setRowsData: (rowsInput: T[]) => void;
  applyTransaction: (
    transaction: RowDataTransaction<T> | RowDataTransaction<T>[]
  ) => void;
  clearRows: () => void;
  setPinnedTopRow: (data: T | null) => void;
  ensureRowVisible: (row: RowNode<T>) => void;
  getVisibleRows: () => RowNode<T>[];
  forEachNode: (callback: (node: RowNode<T>) => void) => void;
  forEachNodeAfterFilter: (callback: (node: RowNode<T>) => void) => void;
};

/**
 * The single view-layer home for every ROW / SELECTION operation — the
 * row-side counterpart of useColumnController. Each method dispatches a
 * RowManager / SelectionManager command and composes the documented view side
 * effects (selection-map maintenance, scroll, user callbacks, action-sheet
 * close). No pipeline math lives here; that stays in the pure-TS managers.
 *
 * Every returned function has a STABLE identity (useRefCallback). Operations
 * that previously lived in DataGrid (the selection handlers, setRowExpandedState)
 * and in useGridController (the imperative row API) are unified here, which also
 * removes the cross-hook dep passes those used to require (e.g. ensureRowVisible
 * calling setRowExpandedState).
 */
export function useRowController<T extends Object>(
  deps: UseRowControllerDeps<T>
): RowController<T> {
  const {
    engine,
    rowManager,
    selectionManager,
    rows,
    columns,
    nodesSelection,
    rowsDataRef,
    gridCoreApiRef,
    setTopRowNode,
    setSelectedColumn,
    getRowId,
    onSelectionChanged,
    onRowsUpdated,
    onRowGroupOpened,
    font,
    updateColumnWidthCache,
  } = deps;

  // ── Selection ──────────────────────────────────────────────────────────────

  // Preserves the legacy React-style setter contract for the
  // GridSelectionContext value; dispatches a Set command so SelectionManager
  // stays the single source of truth.
  const setNodesSelection = useRefCallback(
    (
      value: React.SetStateAction<Map<string, 0 | 1 | 2>>
    ) => {
      const next =
        typeof value === "function"
          ? (value as (prev: Map<string, 0 | 1 | 2>) => Map<string, 0 | 1 | 2>)(
              selectionManager.getNodesSelection()
            )
          : value;
      engine.dispatch({
        type: SelectionCommandTypes.Set,
        nodesSelection: next,
      } as SelectionCommand<T>);
    },
    [engine, selectionManager]
  ) as React.Dispatch<React.SetStateAction<Map<string, 0 | 1 | 2>>>;

  const updateRowNodeSelection = useRefCallback(
    (row: RowNode<T>) => {
      engine.dispatch({
        type: SelectionCommandTypes.Toggle,
        row,
      } as SelectionCommand<T>);
    },
    [engine]
  );

  const updateRowSelectionState = useRefCallback(
    (rowId: string, selected: boolean) => {
      engine.dispatch({
        type: SelectionCommandTypes.SetById,
        rowId,
        selected,
      } as SelectionCommand<T>);
    },
    [engine]
  );

  const deselectAll = useRefCallback(() => {
    engine.dispatch({
      type: SelectionCommandTypes.Clear,
    } as SelectionCommand<T>);
  }, [engine]);

  const toggleAllSelection = useRefCallback(() => {
    engine.dispatch({
      type: SelectionCommandTypes.ToggleAll,
    } as SelectionCommand<T>);
  }, [engine]);

  const getSelectedNodes = useRefCallback(() => {
    return rows.filter((row) =>
      row.group
        ? getFolderCalculatedCheckedState(row.children, nodesSelection) === 1
        : nodesSelection.get(row.__id) === 1
    );
  }, [nodesSelection, rows]);

  // ── Row pipeline ─────────────────────────────────────────────────────────────

  const setRowExpandedState = useRefCallback(
    (
      row: RowNode<T>,
      expand: boolean,
      options?: Parameters<SkiaGridAPI<T>["setRowExpandedState"]>[2]
    ) => {
      engine.dispatch({
        type: RowCommandTypes.SetRowExpanded,
        row,
        expand,
        options,
      } as RowManagerCommand<T>);
      onRowGroupOpened?.({
        node: { ...row, expanded: expand },
      });
    },
    [engine, onRowGroupOpened]
  );

  // Internal: shared mutation path used by applyTransaction. Updates the source
  // ref, dispatches SetRows, prunes removed ids from the selection map, fires
  // user callbacks.
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
    [engine, nodesSelection, setNodesSelection, rows, onSelectionChanged]
  );

  const setRowsData = useRefCallback(
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

  const clearRows = useRefCallback(() => {
    rowsDataRef.current = [];
    engine.dispatch({
      type: RowCommandTypes.SetRows,
      rows: [],
    } as RowManagerCommand<T>);
    setSelectedColumn(null);
  }, [engine, rowsDataRef, setSelectedColumn]);

  const setPinnedTopRow = useRefCallback((data: T | null) => {
    setTopRowNode(
      data === null ? null : transformDataToRowNode([data], getRowId)[0]
    );
  }, [setTopRowNode, getRowId]);

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
    [rows, columns, gridCoreApiRef, setRowExpandedState]
  );

  const getVisibleRows = useRefCallback(() => rows, [rows]);

  const forEachNode = useRefCallback(
    (callback: (node: RowNode<T>) => void) => {
      rowsDataRef.current.forEach((row) => callback(row));
    },
    [rowsDataRef]
  );

  const forEachNodeAfterFilter = useRefCallback(
    (callback: (node: RowNode<T>) => void) => {
      rowManager.getFilteredRows().forEach((row) => callback(row));
    },
    [rowManager]
  );

  return {
    setNodesSelection,
    updateRowNodeSelection,
    updateRowSelectionState,
    deselectAll,
    toggleAllSelection,
    getSelectedNodes,
    setRowExpandedState,
    setRowsData,
    applyTransaction,
    clearRows,
    setPinnedTopRow,
    ensureRowVisible,
    getVisibleRows,
    forEachNode,
    forEachNodeAfterFilter,
  };
}
