/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: incrementally remove per-line */
import type { SkTypefaceFontProvider } from "@shopify/react-native-skia";

import type { GridTheme } from "../../themes";
import type {
  CellEditingParams,
  CellRenderer,
  ValueFormatter,
  ValueGetter,
} from "./cell";
import type { FilterType } from "./constants";
import type {
  ColumnFilterState,
  FilterParams,
  MultiFilterParams,
} from "./filter";
import type { GridIcons } from "./icons";
import type {
  ColumnAlignment,
  ColumnPinnedType,
  PinActionsType,
} from "./primitives";
import type { RowNode } from "./row";
import type { MultiColumnSortStatus, SortDir, SortValueGetter } from "./sort";

export type ColumnStateParams = {
  /** True if the column is hidden */
  hide?: boolean | null;
  /** Width of the column in pixels */
  width?: number;
  /** Column's flex if flex is set */
  flex?: number | null;
  /** Sort applied to the column */
  sort?: SortDir;
  /** The order of the sort, if sorting by many columns */
  sortIndex?: number | null;
  /** The aggregation function applied */
  aggFunc?: string | null;
  /** True if pivot active */
  pivot?: boolean | null;
  /** The order of the pivot, if pivoting by many columns */
  pivotIndex?: number | null;
  /** Set if column is pinned */
  pinned?: ColumnPinnedType;
  /** True if row group active */
  rowGroup?: boolean | null;
  /** The order of the row group, if grouping by many columns */
  rowGroupIndex?: number | null;
};

export type ColumnState<T extends Object = any> = (ColumnStateParams &
  CellEditingParams<T>) & {
  /** ID of the column */
  colId: string;
};

export type SkiaGridColumn<T extends Object = any> = Omit<
  ColumnState<T>,
  "colId" | "width"
> & {
  id?: string;
  colId?: string;
  name: string;
  headerName?: string;
  headerClass?:
    | string
    | string[]
    | ((params: any) => string | string[] | undefined);
  width: number;
  field: string;
  hide?: boolean;
  type?: string;
  pinned?: PinActionsType;
  sortable?: boolean;
  canGrouped?: boolean;
  canPinned?: boolean;
  canFilter?: boolean;
  canResize?: boolean;
  alignment?: ColumnAlignment;
  redIfNegative?: boolean;
  valueGetter?: ValueGetter<T>;
  sortValueGetter?: SortValueGetter<T>;
  valueFormatter?: ValueFormatter<T>;
  filterType?: FilterType;
  filterParams?: FilterParams | MultiFilterParams;
  filterKey?: string | (() => string);
  cellRenderer?: CellRenderer<T>;
  cellRendererParams?: any;
  extra?: Record<string, any>;
  checkboxSelection?: boolean;
  headerCheckboxSelection?: boolean;
  isSelected?: boolean;
  icons?: GridIcons;
  headerTooltip?: string;
  tooltipValueGetter?: (node?: RowNode<T>, context?: any) => string;
  tooltipRenderer?: any;
  sortByAbsoluteValue?: boolean;
};

export type SkiaColGroupDef<T extends Object = any> = {
  headerName: string;
  children: SkiaGridColumnDef<T>[];
};

export type SkiaGridColumnDef<T extends Object = any> =
  | SkiaGridColumn<T>
  | SkiaColGroupDef<T>;

export type SkiaInternalGridColumn<T extends Object = any> = Omit<
  SkiaGridColumn<T>,
  "id"
> & {
  id: string;
  __id: string;
  __index: number;
};

export type ApplyColumnStateParams<T extends Object> = {
  /** The state from `getColumnState` */
  state?: SkiaGridColumn<T>[];
  /** Whether column order should be applied */
  applyOrder?: boolean;
};

export type ColumnHeaderContentProps<T extends Object> = {
  columns: SkiaInternalGridColumn<T>[];
  xOffset?: number;
  headerHeight: number;
  topRowNodeHeight: number;
  fontManager: SkTypefaceFontProvider | null;
  theme: GridTheme;
  fontSize: number;
  sortStatus?: MultiColumnSortStatus;
  filterState?: Map<string, ColumnFilterState>;
  topRowNode?: RowNode<T> | null;
  headerSelectionState: 0 | 1 | 2;
  icons: GridIcons;
};
