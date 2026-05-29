// ─── Theme API ───────────────────────────────────────────────────────────────
// Export first to avoid circular dependency — Grid.tsx depends on themes
export { createTheme } from "./themes/createTheme";
export { darkTheme } from "./themes/presets/dark";
export { lightTheme } from "./themes/presets/light";
export { DEFAULT_TOKENS } from "./themes/tokens";
export {
  GridThemeProvider,
  GridThemeContext,
  useGridTheme,
} from "./themes/GridThemeProvider";
export type { GridTheme, GridThemeTokens } from "./themes/tokens";

// ─── Slots API ───────────────────────────────────────────────────────────────
export { SlotsProvider, useSlots } from "./view/slots";
export type { GridSlots } from "./view/slots";

// ─── Grid Component ──────────────────────────────────────────────────────────
export { Grid, createGridComp } from "./view/DataGrid";

// ─── Column Chooser ──────────────────────────────────────────────────────────
export { ColumnChooserModal } from "./view/columnChooser/ColumnChooserModal";
export {
  ColumnMenuContext,
  ColumnMenuContextProvider,
} from "./view/columnChooser/ColumnMenuProvider";
export type { ColumnMenuContextProviderAPI } from "./view/columnChooser/ColumnMenuProvider";

// ─── Types ───────────────────────────────────────────────────────────────────
// Core grid types
export type {
  GridReportableState,
  SkiaGridAPI,
  SkiaGridCoreAPI,
  SkiaGridProps,
  SkiaGridColumn,
  SkiaGridColumnDef,
  SkiaColGroupDef,
  SkiaInternalGridColumn,
  SkiaGridTapLocation,
} from "./core/types";

// Row types
export type {
  RowNode,
  RowDataTransaction,
  RowNodeTransaction,
  GroupRowNode,
  RowGroupOption,
} from "./core/types";

// Column types
export type {
  ColumnState,
  ColumnStateParams,
  ColumnAlignment,
  ColumnSection,
  ColumnSort,
  ColumnFilterState,
  ColumnPinnedType,
  ColumnGroupPath,
  ColumnGroupHeader,
  ApplyColumnStateParams,
} from "./core/types";

// Cell types
export type {
  CellRenderer,
  CellRendererProps,
  CellEditorParams,
  CellEditingParams,
  CellEditingStartedEvent,
  CellEditingStoppedEvent,
  CellTooltipProps,
} from "./core/types";

// Value & formatter types
export type {
  ValueGetter,
  ValueFormatter,
  ValueFormatterArgs,
  AggFunc,
  AggFuncParams,
  EditableCallback,
} from "./core/types";

// Filter types
export type {
  FilterModel,
  CombinedFilterModel,
  FilterType,
  SimpleFilterType,
  JoinOperator,
  FilterParams,
  TextFilterParams,
  ScalarFilterParams,
  NumberFilterParams,
  DateFilterParams,
  SetFilterParams,
  SetFilterType,
  MultiFilterParams,
  ProvidedFilterParams,
  FilterOptionDef,
  TextMatcherParams,
  FilterButtonType,
  GridFilterType,
} from "./core/types";

// Sort types
export type {
  SortDir,
  SortOrder,
  SortStatus,
  SortValueGetter,
  MultiColumnSortStatus,
  MultiColumnSortStatusEntry,
} from "./core/types";

// Enum-like constants
export {
  JoinOperators,
  FilterTypes,
  SimpleFilterTypes,
  GridFilterTypes,
  FilterButtonTypes,
  PinnedStatuses,
} from "./core/types";

// Misc types
export type {
  DrawingContext,
  PinActionsType,
  GridIcons,
  GridIconType,
  OverrideIcon,
  RowSelectionMode,
  PinnedStatus,
  SelectedCellParams,
  RowGroupOpenedEvent,
  DrawLocationProps,
  ColumnActionNavigationProp,
  ColumnActionStackParamList,
} from "./core/types";

// ─── Drawing Utilities (for custom cell renderers) ───────────────────────────
export {
  clipCell,
  drawDashedLine,
  drawEditableCellBackground,
  drawEditableCellPressOverlay,
  drawSvgPath,
  drawText,
  getFillPaint,
  getStrokePaint,
  getTextAlign,
} from "./renderer/drawing/drawMethods";
export type {
  DrawTextStyle,
  DrawParagraphStyle,
  DrawSizeProps,
  DrawTextProps,
} from "./renderer/drawing/drawMethods";

// ─── Font Utilities ──────────────────────────────────────────────────────────
export {
  getFont,
  getTextWidth,
  defaultFontFamily,
} from "./renderer/drawing/fontUtils";

// ─── Grid Utilities ──────────────────────────────────────────────────────────
export {
  applyGridTransaction,
  flattenColumnDefs,
  getDisplayValue,
  getIsRowSelected,
  transformDataToRowNode,
  randomValue,
  mapToInternalColumns,
  isColGroupDef,
} from "./utils/gridUtils";

// ─── Constants ───────────────────────────────────────────────────────────────
export {
  CELL_PADDING,
  DEFAULT_FONT_SIZE,
  EDITABLE_CELL_PADDING,
  GROUP_COLUMN_ID,
  GROUP_COLUMN_NAME,
  ROW_HEIGHT_DEFAULT,
  HEADER_ROW_HEIGHT_DEFAULT,
  ROW_FONT_SIZE_DEFAULT,
  HEADER_FONT_SIZE_DEFAULT,
  getPadding,
} from "./utils/constants";
