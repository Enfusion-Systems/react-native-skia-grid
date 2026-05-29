/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: incrementally remove per-line */
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SkTypefaceFontProvider } from "@shopify/react-native-skia";
import type { DebouncedFunc } from "lodash";

import type { Density, GridTheme } from "../../themes";
import type { AggFunc } from "./aggregation";
import type {
  CellEditingStartedEvent,
  CellEditingStoppedEvent,
} from "./cell";
import type {
  ApplyColumnStateParams,
  SkiaGridColumn,
  SkiaGridColumnDef,
  SkiaInternalGridColumn,
} from "./column";
import type { ColumnFilterState } from "./filter";
import type { GridContext } from "./drawing";
import type { GridIcons } from "./icons";
import type { ColumnSection, SkiaGridTapLocation } from "./primitives";
import type {
  RowDataTransaction,
  RowGroupOpenedEvent,
  RowGroupOption,
  RowNode,
  RowNodeTransaction,
} from "./row";
import type { ColumnSort, MultiColumnSortStatus } from "./sort";

// Snapshot of grid state emitted by `onLayoutComplete`. Kept intentionally
// flat and JSON-serializable so it can be stringified into a hidden View's
// `accessibilityLabel` for e2e (Detox) introspection.
export type GridReportableState = {
  selectedRowIds: string[];
  rowCount: number;
  columnIds: string[];
  pinnedColumnIds: { left: string[]; right: string[] };
  sortStatus: MultiColumnSortStatus | null;
  filterColumnIds: string[];
  editingCell: { rowId: string; colId: string } | null;
  sectionWidths: Record<ColumnSection, number>;
};

export type SkiaGridAPI<T extends Object = any> = {
  applyTransaction: (transaction: RowDataTransaction<T>) => void;
  setPinnedTopRow: (data: T | null) => void;
  setRowsData: (rows: T[]) => void;
  setFilters: (filterState: Map<string, ColumnFilterState>) => void;
  updateColumn: (id: string, def: SkiaGridColumn<T>) => void;
  setColumns: (columns: SkiaGridColumn<T>[]) => void;
  getColumnState: () => SkiaGridColumn<T>[];
  clearRows: VoidFunction;
  getSelectedNodes: () => RowNode<T>[];
  getVisibleRows: () => RowNode<T>[];
  ensureRowVisible: (row: RowNode<T>) => void;
  setRowExpandedState: (
    row: RowNode<T>,
    expand: boolean,
    options?: RowGroupOption<T>
  ) => void;
  forEachNodeAfterFilter: (callback: (node: RowNode<T>) => void) => void;
  forEachNode: (callback: (node: RowNode<T>) => void) => void;
  applyColumnState: (args: ApplyColumnStateParams<T>) => void;
  deselectAll: () => void;
  updateRowSelectionState: (rowId: string, selected: boolean) => void;
  rebuildRows?: DebouncedFunc<() => void>;
} & SkiaGridCoreAPI;

export type SkiaGridCoreAPI = {
  scrollToRowIndex: (index: number) => void;
  setSectionWidth: (
    sectionWidth: Partial<Record<ColumnSection, number>>,
    multiSelect?: boolean
  ) => void;
  setSelectedRow: (node: RowNode | null) => void;
};

export type ColumnActionStackParamList = {
  ActionsMenu: undefined;
  Filters: undefined;
  AutoSize: undefined;
  Pin: undefined;
};

export type ColumnActionNavigationProp = NativeStackNavigationProp<
  ColumnActionStackParamList,
  "ActionsMenu"
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SkiaGridProps<T extends Object = any> = {
  columnDefs?: SkiaGridColumnDef<T>[];
  defaultColumnDefs?: Partial<SkiaGridColumn<T>>;
  autoGroupColumnDefs?: SkiaGridColumn<T>;
  headerHeight?: number;
  rowHeight?: number;
  longPressDelay?: number;
  getRowId?: (rowData: T) => string;
  getIsRowSelected?: (row: RowNode<T>) => boolean;
  onRowPress?: (
    row: RowNode<T>,
    column: SkiaGridColumn<T>,
    pressCount: number
  ) => void;
  onHeaderRowPress?: (column: SkiaGridColumn<T>, pressCount?: number) => void;
  onHeaderRowLongPress?: (column: SkiaGridColumn<T>) => void;
  onSortChange?: (columnSort: ColumnSort) => void;
  onColumnChange?: () => void;
  onColumnRowGroupChanged?: (column: SkiaInternalGridColumn<T>[]) => void;
  onGridReady?: () => void;
  onTouchStart?: VoidFunction;
  onTouchMove?: VoidFunction;
  onTouchEnd?: VoidFunction;
  onFilterChanged?: (filterState: Map<string, ColumnFilterState>) => void;
  onPressInside?: (location: SkiaGridTapLocation) => void;
  debug?: boolean;
  context?: GridContext;
  showColumnGroupingControl?: boolean;
  selectedRow?: RowNode<T> | null;
  rowBuffer?: number;
  columnBuffer?: number;
  aggFuncs?: Record<string, AggFunc<T>>;
  components?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [p: string]: any;
  };
  onCellEditingStarted?: (event: CellEditingStartedEvent<T>) => void;
  onCellEditingStopped?: (event: CellEditingStoppedEvent<T>) => void;
  rowSelection?: "single" | "multiple";
  rowSelectWithPress?: boolean;
  icons?: GridIcons;
  onSelectionChanged?: (nodes: RowNode<T>[]) => void;
  //Row Events
  rows?: Array<T>;
  pinnedTopRow?: T;
  onRowLongPress?: (row: RowNode<T>, column: SkiaGridColumn<T>) => void;
  onRowsUpdated?: (transaction: RowNodeTransaction<T>) => void;
  columnTypes?: Record<string, Partial<SkiaGridColumn<T>>>;
  onRowGroupOpened?: (event: RowGroupOpenedEvent<T>) => void;
  noDataText?: string;
  columnSectionSpacingWidth?: { left?: number; right?: number };
  enableColumnSectionResize?: boolean;
  bottomInset?: number;
  onSectionResize?: (sectionWidth: Record<ColumnSection, number>) => void;
  fontManager?: SkTypefaceFontProvider | null;
  theme?: GridTheme;
  density?: Density;
  slots?: Partial<import("../../view/slots").GridSlots>;
  suppressGroupChangesColumnVisibility?: boolean;
  /**
   * Called after each redraw cycle with a flat snapshot of grid state.
   * Used by e2e tests (Detox) to introspect Skia-rendered output without
   * pixel diffing; safe for product code as a lifecycle hook too.
   */
  onLayoutComplete?: (state: GridReportableState) => void;
};
