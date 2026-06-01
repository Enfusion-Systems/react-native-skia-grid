import * as React from "react";

import type {
  ApplyColumnStateParams,
  ColumnFilterState,
  SkiaGridAPI,
  SkiaGridColumn,
  SkiaGridCoreAPI,
  SkiaInternalGridColumn,
} from "../core/types";
import type { RowController } from "./useRowController";

// Assembles the public imperative `SkiaGridAPI<T>` from the operation facades.
// All operation bodies now live in useColumnController (column ops) and
// useRowController (row/selection ops); this hook owns no logic — it merges the
// Skia core API (gridCoreApiRef) with those pre-built, stable methods into the
// single object DataGrid hands to `useImperativeHandle`. It is the dedicated
// API-assembly seam, kept symmetric with the two controllers.
export type UseGridControllerDeps<T extends Object> = {
  gridCoreApiRef: React.MutableRefObject<SkiaGridCoreAPI | null>;
  rowController: RowController<T>;
  setFilterState: (filterState: Map<string, ColumnFilterState>) => void;
  rebuildRows?: () => void;
  // Column API methods (from useColumnController).
  setColumnsInternal: (newColumns: SkiaGridColumn<T>[]) => void;
  getColumnState: () => SkiaInternalGridColumn<T>[];
  updateColumn: (id: string, def: SkiaGridColumn<T>) => void;
  applyColumnState: (args: ApplyColumnStateParams<T>) => void;
};

export function useGridController<T extends Object>(
  deps: UseGridControllerDeps<T>
): SkiaGridAPI<T> {
  const {
    gridCoreApiRef,
    rowController,
    setFilterState,
    rebuildRows,
    setColumnsInternal,
    getColumnState,
    updateColumn,
    applyColumnState,
  } = deps;

  return {
    ...gridCoreApiRef.current,
    // row / selection
    applyTransaction: rowController.applyTransaction,
    setPinnedTopRow: rowController.setPinnedTopRow,
    setRowsData: rowController.setRowsData,
    clearRows: rowController.clearRows,
    getSelectedNodes: rowController.getSelectedNodes,
    setRowExpandedState: rowController.setRowExpandedState,
    getVisibleRows: rowController.getVisibleRows,
    ensureRowVisible: rowController.ensureRowVisible,
    forEachNodeAfterFilter: rowController.forEachNodeAfterFilter,
    forEachNode: rowController.forEachNode,
    deselectAll: rowController.deselectAll,
    updateRowSelectionState: rowController.updateRowSelectionState,
    // column
    setColumns: setColumnsInternal,
    getColumnState,
    updateColumn,
    applyColumnState,
    // filter + pipeline
    setFilters: setFilterState,
    rebuildRows,
  } as SkiaGridAPI<T>;
}
