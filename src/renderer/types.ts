import type { SkTypefaceFontProvider } from "@shopify/react-native-skia";

import type { GridTheme } from "../themes";
import type {
  ColumnFilterState,
  ColumnGroupHeader,
  ColumnSection,
  GridContentIndexes,
  GridContext,
  GridIcons,
  MultiColumnSortStatus,
  PinnedStatus,
  RowNode,
  RowSelectionMode,
  SectionSeparatorKeys,
  SelectedCellParams,
  SkiaGridColumn,
  SkiaInternalGridColumn,
} from "../core/types";

export type CreateHeaderBackgroundLayerProps<T extends Object> = {
  columns: SkiaInternalGridColumn<T>[];
  headerHeight: number;
  totalHeaderHeight: number;
  columnGroupHeaders?: ColumnGroupHeader[];
  colGroupDepthMap?: Map<string, number>;
  xVal: Record<ColumnSection, number>;
  pinnedStatus: ColumnSection;
  columnWidths: Record<ColumnSection, number>;
  topRowNodeHeight: number;
  theme: GridTheme;
  rowSelection: RowSelectionMode;
  fontManager: SkTypefaceFontProvider | null;
};

export type CreateHeaderOverlayLayerProps<T extends Object> = Omit<
  CreateHeaderBackgroundLayerProps<T>,
  "columns" | "pinnedStatus" | "columnWidths" | "topRowNodeHeight"
> & {
  columns: Record<ColumnSection, SkiaInternalGridColumn<T>[]>;
  selectedColumn: SkiaInternalGridColumn<T>;
  isColumnResizing: boolean;
  canvasWidth: number;
  yVal: number;
};

export type CreateSectionOverlayLayerProps = {
  canvasWidth: number;
  yVal: number;
  theme: GridTheme;
  xVal: Record<ColumnSection, number>;
  selectedSection: SectionSeparatorKeys;
  headerHeight: number;
  fontManager: SkTypefaceFontProvider | null;
  isSectionResizing: boolean;
};

export type CreateHeaderContentLayerProps<T extends Object> =
  CreateHeaderBackgroundLayerProps<T> &
    Pick<
      import("../core/types/column").ColumnHeaderContentProps<T>,
      | "fontManager"
      | "filterState"
      | "sortStatus"
      | "topRowNode"
      | "headerSelectionState"
      | "icons"
    > & {
      fontSize?: number;
      cellFontSize?: number;
    };

export type CreateCellBackgroundLayerProps<T extends Object> = Omit<
  CreateHeaderBackgroundLayerProps<T>,
  | "columns"
  | "topRowNodeHeight"
  | "headerHeight"
  | "columnGroupHeaders"
  | "colGroupDepthMap"
> & {
  fullHeight: number;
  rowHeight: number;
  rowsData: RowNode<T>[];
  topRowNode: boolean;
  rowSelection: RowSelectionMode;
  selectedCellCol?: SkiaInternalGridColumn<T> | null;
  selectedCellRow?: RowNode<T>;
};

export type DrawCellContentProps<T extends Object> = {
  indexes: GridContentIndexes;
  rowHeight: number;
  columns: SkiaInternalGridColumn<T>[];
  rows: RowNode<T>[];
  gridIcons: GridIcons;
  fontManager: SkTypefaceFontProvider | null;
  isRowSelected: () => 0 | 1 | 2;
  theme: GridTheme;
  baseXOffset: number;
  baseYOffset: number;
  context: GridContext;
  selectedCellParams: SelectedCellParams<T>;
  pinnedStatus: PinnedStatus;
  nodesSelection?: Map<string, 0 | 2 | 1>;
};

export type CreateCellOverlayLayerProps<T extends Object> = {
  rowHeight: number;
  totalHeaderHeight: number;
  theme: GridTheme;
  columnWidths: Record<ColumnSection, number>;
  xVal: Record<ColumnSection, number>;
  rowsData: RowNode<T>[];
  topRowNode: boolean;
  fullHeight: number;
  yPos: number;
  rowSelection: RowSelectionMode;
  selectedCellParams?: SelectedCellParams<T>;
  pinnedStatus: PinnedStatus;
  columns: SkiaInternalGridColumn<T>[];
  nodesSelection: Map<string, 0 | 1 | 2>;
  fontManager: SkTypefaceFontProvider | null;
};

export type NoDataLayerProps = {
  totalHeaderHeight: number;
  rowHeight: number;
  topRowNode: boolean;
  theme: GridTheme;
  canvasWidth: number;
  canvasHeight: number;
  fontManager: SkTypefaceFontProvider | null;
  text?: string;
};

export type SectionSeparatorLayerProps = {
  x: number;
  height: number;
  width: number;
  theme: GridTheme;
  fontManager: SkTypefaceFontProvider | null;
};

export type DrawOverlayProps<T extends Object> = {
  xOffset: number;
  theme: GridTheme;
  headerHeight: number;
  canvasWidth: number;
  rowHeight: number;
  yVal: number;
  yOffset: number;
  rowSelection: RowSelectionMode;
  nodesSelection: Map<string, 0 | 1 | 2>;
  columns?: SkiaGridColumn<T>[];
  icons?: GridIcons;
  isHeaderSelected?: 0 | 1 | 2;
  rowsData?: RowNode<T>[];
  pinnedStatus?: PinnedStatus;
  xCellVal?: number;
  selectedCellParams?: SelectedCellParams<T>;
};
