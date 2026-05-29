/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: incrementally remove per-line */
import type {
  DrawTextLocation,
  DrawTextStyleList,
  GridContext,
  GridCtx,
} from "./drawing";
import type { GridIcons } from "./icons";
import type { PinnedStatus } from "./constants";
import type { RowNode } from "./row";
import type { SkiaGridColumn, SkiaInternalGridColumn } from "./column";
import type { SortDir } from "./sort";

export type CellRendererProps<T extends Object> = {
  overlayColor?: string;
  selectedCellColor?: string;
  textColor: string;
  backgroundColor?: string;
  column?: SkiaInternalGridColumn<T>;
  fontSize: number;
  width: number;
  height: number;
  x: number;
  y: number;
  value: string;
  pinnedStatus?: PinnedStatus;
  row?: RowNode<T>;
  pinned?: boolean;
  context?: GridContext;
  selected?: boolean;
  sortDirection?: SortDir;
  textRight?: boolean;
  sortIndex?: string | null;
  columnSelectedBackground?: string;
  isFiltered?: boolean;
  icons?: GridIcons;
  nodesSelection?: Map<string, 0 | 2 | 1>;
  selectedCellParams?: SelectedCellParams<T>;
  drawText: (
    value: string,
    style?: DrawTextStyleList,
    location?: DrawTextLocation
  ) => void;
};

export type CellTooltipProps = {
  tooltipValue: string;
  node: RowNode;
  context?: any;
};

export type ValueGetter<T extends Object = any> = (
  row: RowNode<T>
) => string | number;

export type ValueFormatterArgs<T extends Object = any> = {
  row: RowNode<T>;
  column: SkiaGridColumn<T>;
  value: string | number;
};

export type ValueFormatter<T extends Object = any> = (
  args: ValueFormatterArgs<T>
) => string | number;

export type CellRenderer<T extends Object = any> = (
  args: CellRendererProps<T>,
  ctx: GridCtx
) => void;

export type EditableCallback<T extends Object> = (
  node?: RowNode<T>,
  context?: any,
  nodesSelection?: Map<string, 0 | 2 | 1>,
  column?: SkiaInternalGridColumn<T>
) => boolean;

export type CellEditingParams<T extends Object = any> = {
  /**True if column is editable */
  editable?: boolean | EditableCallback<T>;
  valueSetter?: any;
  valueParser?: any;
  cellEditor?: any;
  cellEditorParams?: any;
  cellEditorSelector?: (params: CellEditorParams) => {
    component?: any;
    params?: any;
  };
};

export type CellEditorParams<T extends Object = any, K = any> = {
  colDef: SkiaInternalGridColumn<T>;
  value?: K; // value of the call else undefined
  data?: T;
  node: RowNode<T>;
  context?: any; // grid context
  onValueChange: (value?: K) => void;
  stopEditing: (cancelEdit?: boolean) => void;
};

export type CellEditingStartedEvent<T extends Object = any> =
  CellEditorParams<T> & {
    rowIndex: number | null; //if accessible
  };

export type CellEditingStoppedEvent<T extends Object = any> = {
  //old value before editing
  oldValue?: any | null;
  // new value after editing
  newValue?: any | null;
  //indicating if the value of the editor has changed
  valueChanged?: boolean;
  colDef: SkiaInternalGridColumn<T>;
  data?: T;
  node: RowNode<T>;
  rowIndex: number | null;
  context?: any;
};

export type SelectedCellParams<T extends Object> = {
  row: RowNode<T> | null;
  cellEditingParams: CellEditingStartedEvent<T> | null;
  cellTooltip?: string | null;
  isEditable?: boolean | undefined;
};
