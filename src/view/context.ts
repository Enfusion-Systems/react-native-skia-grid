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

// Reactive column STATE — the column model plus the derived/interaction state
// that drives re-renders (which column's menu is open, sort, filter, resize).
// Split from GridActionsContext (the stable OPERATIONS) below purely along the
// reactive-vs-stable axis: changes here re-render consumers; the operations
// never do. All these change on low-frequency user gestures (sort / filter /
// pin / group / menu open / resize start-end), so they share one context.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GridColumnsContextState<T extends Object = any> = {
  columns: SkiaInternalGridColumn<T>[];
  selectedColumn: SkiaInternalGridColumn<T> | null;
  sortStatus?: MultiColumnSortStatus;
  filterState: Map<string, ColumnFilterState>;
  isColumnResizing: boolean;
};

// Column OPERATIONS — every value here has a STABLE identity (functions wrapped
// in useRefCallback, useState setters), so this context never re-renders its
// consumers when the reactive column state above changes. Read by the action
// menus and the grouping control to mutate columns. Keeping operations apart
// from state is what lets pure-operation consumers (ActionMenu / PinMenu /
// AutoSizeMenu) avoid re-rendering on every selectedColumn / sort / filter /
// resize change.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GridActionsContextState<T extends Object = any> = {
  setColumns: (columns: SkiaInternalGridColumn<T>[]) => void;
  setSelectedColumn: React.Dispatch<
    React.SetStateAction<SkiaInternalGridColumn<T> | null>
  > | null;
  setIsColumnResizing: React.Dispatch<React.SetStateAction<boolean>>;
  setFilterState: (filterState: Map<string, ColumnFilterState>) => void;
  onColumnChange?: () => void;
  rebuildRows?: DebouncedFunc<() => void>;
  sortColumn?: (
    column: SkiaInternalGridColumn<T>,
    isLongPressed: boolean,
    sortByAbsoluteValue?: boolean
  ) => void;
  onGrouped?: (
    grouped: boolean,
    selectedColumn: SkiaInternalGridColumn<T>
  ) => void;
  onPinned?: (column: SkiaInternalGridColumn<T>, key: PinActionsType) => void;
  autoSizeColumns: (selectedColumn: SkiaInternalGridColumn<T>[] | []) => void;
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
  selectedColumn: null,
  filterState: new Map(),
  isColumnResizing: false,
});

export const GridActionsContext = React.createContext<GridActionsContextState>({
  setColumns: () => null,
  setSelectedColumn: null,
  setIsColumnResizing: () => null,
  setFilterState: () => null,
  autoSizeColumns: () => null,
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
