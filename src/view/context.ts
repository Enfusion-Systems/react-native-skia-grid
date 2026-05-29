import { type SkTypefaceFontProvider, Skia } from "@shopify/react-native-skia";
import type { DebouncedFunc } from "lodash";
import React from "react";

import type {
  ColumnFilterState,
  ColumnGroupPath,
  MultiColumnSortStatus,
  PinActionsType,
  RowNode,
  SkiaInternalGridColumn,
} from "../core/types";

// Layout / static rendering metrics. Read by all renderer layers; rarely
// changes. Kept separate so high-frequency selection/filter updates don't
// invalidate layout-only consumers (separators, overlays, backgrounds).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GridLayoutContextState<T extends Object = any> = {
  fontManager: SkTypefaceFontProvider;
  totalHeaderHeight: number;
  fullHeight: number;
  topRowNode: RowNode<T> | null;
  columnGroupPaths: Map<string, ColumnGroupPath>;
};

// Row data + selection state. Mutates on every selection toggle and on every
// pipeline recompute — scoped to the cell-rendering consumers that actually
// depend on it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GridSelectionContextState<T extends Object = any> = {
  rows: RowNode<T>[];
  rowsData: RowNode<T>[];
  nodesSelection: Map<string, 0 | 1 | 2>;
  setNodesSelection: React.Dispatch<
    React.SetStateAction<Map<string, 0 | 1 | 2>>
  >;
  getSelectedNodes: () => RowNode<T>[];
};

// Column metadata. Mutates on resize / reorder / group / pin.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GridColumnsContextState<T extends Object = any> = {
  columns: SkiaInternalGridColumn<T>[];
  setColumns: (columns: SkiaInternalGridColumn<T>[]) => void;
};

// Modal-driven actions and selected-column coordination. Read by the column
// action menus and (for selectedColumn + isColumnResizing) by GridCanvas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GridActionsContextState<T extends Object = any> = {
  selectedColumn: SkiaInternalGridColumn<T> | null;
  setSelectedColumn: React.Dispatch<
    React.SetStateAction<SkiaInternalGridColumn<T> | null>
  > | null;
  sortStatus?: MultiColumnSortStatus;
  sortColumn?: (
    column: SkiaInternalGridColumn<T>,
    isLongPressed: boolean,
    sortByAbsoluteValue?: boolean
  ) => void;
  filterState: Map<string, ColumnFilterState>;
  setFilterState: (filterState: Map<string, ColumnFilterState>) => void;
  onGrouped?: (
    grouped: boolean,
    selectedColumn: SkiaInternalGridColumn<T>
  ) => void;
  onPinned?: (column: SkiaInternalGridColumn<T>, key: PinActionsType) => void;
  onColumnChange?: () => void;
  rebuildRows?: DebouncedFunc<() => void>;
  autoSizeColumns: (selectedColumn: SkiaInternalGridColumn<T>[] | []) => void;
  isColumnResizing: boolean;
  setIsColumnResizing: React.Dispatch<React.SetStateAction<boolean>>;
  updateColumnWidthCache: (
    updateWidths: Record<string, number>[],
    removeWidths: Record<string, number>[]
  ) => void;
  resetColumnWidthCache?: (rows: RowNode<T>[]) => Promise<void>;
};

export const GridLayoutContext = React.createContext<GridLayoutContextState>({
  fontManager: Skia.FontMgr.System() as SkTypefaceFontProvider,
  totalHeaderHeight: 0,
  fullHeight: 0,
  topRowNode: null,
  columnGroupPaths: new Map(),
});

export const GridSelectionContext =
  React.createContext<GridSelectionContextState>({
    rows: [],
    rowsData: [],
    nodesSelection: new Map(),
    setNodesSelection: () => new Map(),
    getSelectedNodes: () => [],
  });

export const GridColumnsContext = React.createContext<GridColumnsContextState>({
  columns: [],
  setColumns: () => null,
});

export const GridActionsContext = React.createContext<GridActionsContextState>({
  selectedColumn: null,
  setSelectedColumn: null,
  filterState: new Map(),
  setFilterState: () => null,
  autoSizeColumns: () => null,
  isColumnResizing: false,
  setIsColumnResizing: () => null,
  updateColumnWidthCache: () => null,
});

// Combined snapshot of all four contexts. Used by `ColumnActionsModal` and
// its descendants, which render inside a `BottomSheet` portal where the
// provider tree isn't reachable — the modal snapshots all contexts at the
// React side of the portal boundary and passes the snapshot down by prop.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface GridContextSnapshot<T extends Object = any>
  extends GridLayoutContextState<T>,
    GridSelectionContextState<T>,
    GridColumnsContextState<T>,
    GridActionsContextState<T> {}

export function useGridLayout() {
  return React.useContext(GridLayoutContext);
}

export function useGridSelection() {
  return React.useContext(GridSelectionContext);
}

export function useGridColumns() {
  return React.useContext(GridColumnsContext);
}

export function useGridActions() {
  return React.useContext(GridActionsContext);
}
