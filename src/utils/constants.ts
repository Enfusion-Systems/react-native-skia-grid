import { Platform } from "react-native";

export const getPadding = (left: number, right?: number) => ({
  left,
  right: right || left,
});

export const GROUPED_ROW_PADDING = 5;
export const CELL_PADDING = 5;
export const MIN_COLUMN_SIZE = 40;
export const COLUMN_GROUPING_CONTROL_HEIGHT = 36;
export const LONG_PRESS_DURATION = 1000;
export const DEFAULT_FILTER_DEBOUNCE_MS = 200;
export const VELOCITY_FACTOR = Platform.OS === "android" ? 1 : 1.5;
export const CHECKBOX_COLUMN_HEADER = "__root__";
export const MIN_SECTION_SIZE = 30;
export const RESIZE_ICON_WIDTH = 20;

export const NO_DATA_PADDING = 5;
export const NO_DATA_DEFAULT_WIDTH = 100;
export const NO_DATA_FONT_SIZE = 18;
export const EDITABLE_CELL_PADDING = 2;
export const DEFAULT_ICON_SIZE = 22;
export const ICON_WIDTH = 20;
export const OOO_TEXT = "...";

export const BOX_RADIUS = 5;
export const BOX_SIZE = 18;
export const BOX_HEIGHT = 3;
export const BOX_OFFSET = 6;

export const ROW_HEIGHT_DEFAULT = 30;
export const HEADER_ROW_HEIGHT_DEFAULT = 25;
export const ROW_FONT_SIZE_DEFAULT = 15;
export const HEADER_FONT_SIZE_DEFAULT = 14;
export const DEFAULT_FONT_SIZE = 16;
export const FONT_WIDTH_ADJ_MULTIPLIER = 1.09;

export const GROUP_KEY_SEPARATOR = "§";
export const GROUP_COLUMN_ID = "__GROUP__";
export const GROUP_COLUMN_NAME = "Group";
