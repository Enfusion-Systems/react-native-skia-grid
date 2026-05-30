import * as React from "react";

import type {
  ApplyColumnStateParams,
  EngineHost,
  PinActionsType,
  SkiaGridColumn,
  SkiaInternalGridColumn,
} from "../core/types";
import { useRefCallback } from "../internal/hooks";
import {
  ColumnCommandTypes,
  type ColumnManager,
  type ColumnManagerCommand,
} from "../core/managers/ColumnManager";
import {
  SelectionCommandTypes,
  type SelectionCommand,
} from "../core/managers/SelectionManager";
import { SelectionCellRenderer } from "../renderer/cellRenderers/SelectionCellRenderer";
import { CELL_PADDING } from "../utils/constants";
import { mapToInternalColumns } from "../utils/gridUtils";

// Inputs the column facade needs. All are already owned elsewhere in DataGrid
// (managers, the projected `columns`, the Skia width cache, modal-state setter,
// the row-pipeline trigger, user props) — the controller just captures them so
// every column OPERATION lives in one place.
export type UseColumnControllerDeps<T extends Object> = {
  engine: EngineHost;
  columnManager: ColumnManager<T>;
  // The projected column list (logical columns + synthetic group column). Used
  // for index-based ops (autoSize / updateColumn / applyColumnState).
  columns: SkiaInternalGridColumn<T>[];
  // Skia-measured width cache (owned by useColumnWidthCache).
  columnWidthMap: React.MutableRefObject<Map<string, number>>;
  recomputeGroupColumnWidth: (
    groupedColumns: SkiaInternalGridColumn<T>[]
  ) => void;
  // React modal-state setter (closes the action sheet on a terminal action).
  setSelectedColumn: React.Dispatch<
    React.SetStateAction<SkiaInternalGridColumn<T> | null>
  >;
  // Cross-manager row-pipeline recompute trigger (RowManager).
  rebuildRows: () => void;
  // Multi-sort latch shared with the renderer.
  isMultiSortEnabled: React.MutableRefObject<boolean>;
  // User callbacks / config.
  onColumnChange?: () => void;
  onColumnRowGroupChanged?: (
    groupedColumns: SkiaInternalGridColumn<T>[]
  ) => void;
  suppressGroupChangesColumnVisibility?: boolean;
  defaultColumnDefs?: Partial<SkiaGridColumn<T>>;
  columnTypes?: Record<string, Partial<SkiaGridColumn<T>>>;
};

export type ColumnController<T extends Object> = {
  // Fed into the column / actions contexts (read by GridCanvas, the menus, the
  // grouping control).
  setColumns: (cols: SkiaInternalGridColumn<T>[]) => void;
  onGrouped: (
    grouped: boolean,
    selectedColumn: SkiaInternalGridColumn<T>
  ) => void;
  sortColumn: (
    column: SkiaInternalGridColumn<T>,
    isLongPressed: boolean,
    sortByAbsoluteValue?: boolean
  ) => void;
  onPinned: (col: SkiaInternalGridColumn<T>, key: PinActionsType) => void;
  autoSizeColumns: (cols: SkiaInternalGridColumn<T>[] | []) => void;
  // Imperative SkiaGridAPI surface (assembled in useGridController).
  updateColumn: (id: string, def: SkiaGridColumn<T>) => void;
  setColumnsInternal: (newColumns: SkiaGridColumn<T>[]) => void;
  getColumnState: () => SkiaInternalGridColumn<T>[];
  applyColumnState: (args: ApplyColumnStateParams<T>) => void;
};

/**
 * The single view-layer home for every column OPERATION. Each method follows
 * the same shape — dispatch a `ColumnManager` command, then run the documented,
 * framework-specific side effects (Skia group-width recompute, modal-state
 * reset, `rebuildRows`, user callbacks). No column math lives here; that stays
 * in the pure-TS `ColumnManager`. This is the "imperative shell" half of the
 * functional-core / imperative-shell split.
 *
 * Every returned function has a STABLE identity (useRefCallback), so the
 * actions context built from this controller never re-renders its consumers on
 * reactive state changes.
 */
export function useColumnController<T extends Object>(
  deps: UseColumnControllerDeps<T>
): ColumnController<T> {
  const {
    engine,
    columnManager,
    columns,
    columnWidthMap,
    recomputeGroupColumnWidth,
    setSelectedColumn,
    rebuildRows,
    isMultiSortEnabled,
    onColumnChange,
    onColumnRowGroupChanged,
    suppressGroupChangesColumnVisibility,
    defaultColumnDefs,
    columnTypes,
  } = deps;

  // View-layer wrapper around the SetColumns command. Injects the React
  // SelectionCellRenderer (which can't live in pure-TS core) and normalizes the
  // checkbox column's geometry/flags, then hands the list to ColumnManager
  // which derives sortStatus + groupedColumns. The synthetic GROUP column is
  // NOT injected here — that's a read-path render projection in DataGrid that
  // also covers commands which bypass this wrapper (mount SetColumns, ToggleGroup).
  const setColumns = useRefCallback(
    (cols: SkiaInternalGridColumn<T>[]) => {
      setSelectedColumn(null);
      let newColumns = [...cols];
      const selectionCol = newColumns.find((col) => col.checkboxSelection);
      if (selectionCol) {
        newColumns = [
          {
            ...selectionCol,
            cellRenderer: SelectionCellRenderer,
            width: 30,
            pinned: "left",
            canPinned: false,
            sortable: false,
            canResize: false,
            canFilter: false,
            canGrouped: false,
          },
          ...newColumns.filter(
            (col) =>
              col.checkboxSelection === false || col.colId !== "selection"
          ),
        ];
      }
      engine.dispatch({
        type: ColumnCommandTypes.SetColumns,
        columns: newColumns,
      } as ColumnManagerCommand<T>);
    },
    [engine, setSelectedColumn]
  );

  const onGrouped = useRefCallback(
    (grouped: boolean, selectedColumn: SkiaInternalGridColumn<T>) => {
      if (!selectedColumn) return;

      // 1. Pure column-state mutation → ColumnManager (rowGroupIndex shuffling).
      engine.dispatch({
        type: ColumnCommandTypes.ToggleGroup,
        column: selectedColumn,
        grouped,
        suppressGroupChangesColumnVisibility:
          !!suppressGroupChangesColumnVisibility,
      } as ColumnManagerCommand<T>);

      // 2. Grouping is a terminal action from the column action sheet, so close
      //    the sheet deterministically. (Injecting/removing the group column
      //    changes the rendered column list, which @gorhom reacts to by
      //    dismissing the sheet anyway; doing it explicitly keeps the behavior
      //    predictable. Ungroup is then driven from the grouping pill's ✕.)
      setSelectedColumn(null);

      // 3. On ungroup, drop stale group-row selection entries at the just-removed
      //    level. Dispatched explicitly (not via a manager subscription) because
      //    SelectionManager.rows is refreshed by the RowsChanged that follows
      //    ColumnsChanged — a GroupChanged-subscription handler would fire too
      //    late, against the NEW pipeline output, and clear the wrong level.
      if (!grouped && typeof selectedColumn.rowGroupIndex === "number") {
        engine.dispatch({
          type: SelectionCommandTypes.ClearGroupAtLevel,
          level: selectedColumn.rowGroupIndex,
        } as SelectionCommand<T>);
      }

      // 4. Skia-specific group-column header width recompute. Stays in the view
      //    layer — pure-TS core mustn't depend on Skia font measurement. Reads
      //    the *new* grouped columns from the manager.
      const newGroupedColumns = columnManager.getGroupedColumns();
      recomputeGroupColumnWidth(newGroupedColumns);

      onColumnRowGroupChanged?.(newGroupedColumns);
      rebuildRows();
      onColumnChange?.();
    },
    [
      engine,
      columnManager,
      recomputeGroupColumnWidth,
      setSelectedColumn,
      rebuildRows,
      onColumnChange,
      onColumnRowGroupChanged,
      suppressGroupChangesColumnVisibility,
    ]
  );

  const sortColumn = useRefCallback(
    (
      column: SkiaInternalGridColumn<T>,
      isLongPressed: boolean,
      sortByAbsoluteValue?: boolean
    ) => {
      isMultiSortEnabled.current = isLongPressed;
      engine.dispatch({
        type: ColumnCommandTypes.ToggleSort,
        column,
        isLongPressed,
        sortByAbsoluteValue,
      } as ColumnManagerCommand<T>);
      onColumnChange?.();
      rebuildRows();
    },
    [engine, isMultiSortEnabled, onColumnChange, rebuildRows]
  );

  // Pin routes through the dedicated `Pin` command (needs only the column id)
  // rather than rebuilding the whole column array + re-deriving sort/group. The
  // command spreads `{...col, pinned}`, so the baked-in SelectionCellRenderer
  // survives. Close the sheet to match the previous (wrapper-driven) behavior.
  const onPinned = useRefCallback(
    (col: SkiaInternalGridColumn<T>, key: PinActionsType) => {
      if (!col) return;
      engine.dispatch({
        type: ColumnCommandTypes.Pin,
        columnId: col.__id,
        pinned: key,
      } as ColumnManagerCommand<T>);
      setSelectedColumn(null);
      onColumnChange?.();
    },
    [engine, setSelectedColumn, onColumnChange]
  );

  const autoSizeColumns = useRefCallback(
    (cols: SkiaInternalGridColumn<T>[] | []) => {
      const newColumns = columns.reduce<SkiaInternalGridColumn<T>[]>(
        (res, col) => {
          if (!cols.find((x) => x.__id === col.__id)) {
            res.push(col);
          } else {
            if (!columnWidthMap.current.has(col.__id)) {
              columnWidthMap.current.set(col.__id, col.width);
            }
            res.push({
              ...col,
              width: Math.ceil(
                columnWidthMap.current.get(col.__id)! + 2 * CELL_PADDING
              ),
            });
          }
          return res;
        },
        [] as SkiaInternalGridColumn<T>[]
      );
      setColumns(newColumns);
      onColumnChange?.();
    },
    [columns, columnWidthMap, setColumns, onColumnChange]
  );

  // ── Imperative SkiaGridAPI column methods (assembled in useGridController) ──

  const updateColumn = useRefCallback(
    (id: string, def: SkiaGridColumn<T>) => {
      const colIdx = columns.findIndex((i) => i.id === id);
      if (colIdx === -1) return;
      const newState = [...columns];
      newState[colIdx] = { ...newState[colIdx], ...def };
      setColumns(newState);
      onColumnChange?.();
      rebuildRows();
    },
    [columns, setColumns, onColumnChange, rebuildRows]
  );

  const setColumnsInternal = useRefCallback(
    (newColumns: SkiaGridColumn<T>[]) => {
      const newColumnsState = mapToInternalColumns(
        newColumns,
        defaultColumnDefs,
        columnTypes
      );
      setColumns(newColumnsState);
      rebuildRows();
    },
    [defaultColumnDefs, columnTypes, setColumns, rebuildRows]
  );

  const getColumnState = useRefCallback(
    () => columnManager.getColumns(),
    [columnManager]
  );

  const applyColumnState = useRefCallback(
    (args: ApplyColumnStateParams<T>) => {
      const { state, applyOrder } = args;
      const colDefs = applyOrder && state ? [...state] : [...columns];
      const selectionCol = columns.find((col) => col.checkboxSelection);
      setColumns(
        (selectionCol
          ? [selectionCol, ...colDefs]
          : colDefs) as SkiaInternalGridColumn<T>[]
      );
      rebuildRows();
      onColumnChange?.();
    },
    [columns, setColumns, rebuildRows, onColumnChange]
  );

  return {
    setColumns,
    onGrouped,
    sortColumn,
    onPinned,
    autoSizeColumns,
    updateColumn,
    setColumnsInternal,
    getColumnState,
    applyColumnState,
  };
}
