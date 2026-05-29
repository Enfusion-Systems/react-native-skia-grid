export type GridThemeTokens = {
  // Backgrounds
  backgroundColor: string;
  backgroundHoverColor: string;
  rowAlternateBackgroundColor: string;
  backgroundTertiaryColor: string;
  accentBackgroundColor: string;
  headerBackgroundColor: string;
  cellSelectedBackgroundColor: string;
  rowHoverColor: string;

  // Text
  cellTextColor: string;
  headerTextColor: string;
  cellSelectedTextColor: string;
  mutedTextColor: string;

  // Accent / Interactive
  accentColor: string;
  accentHoverColor: string;

  // Borders
  borderColor: string;
  separatorColor: string;
  borderWidth: number;
  headerBorderWidth: number;
  borderRadius: number;

  // Status
  dangerColor: string;

  // Icons
  sortIconColor: string;
  filterActiveColor: string;
  groupExpandIconColor: string;

  // Checkbox
  checkboxCheckedColor: string;
  checkboxUncheckedColor: string;
  checkboxPartialColor: string;

  // Typography
  fontFamily: string;
  fontSize: number;
  headerFontSize: number;
  headerFontWeight: "normal" | "bold";

  // Layout / Spacing
  cellPadding: number;
  headerPadding: number;
  rowHeight: number;
  headerHeight: number;

  // Directionality
  direction: "ltr" | "rtl";
};

export type GridTheme = Readonly<GridThemeTokens> & {
  withOverrides(overrides: Partial<GridThemeTokens>): GridTheme;
};

export const DEFAULT_TOKENS: GridThemeTokens = {
  backgroundColor: "#0d1117",
  backgroundHoverColor: "rgba(177,186,196,0.06)",
  rowAlternateBackgroundColor: "#111318",
  backgroundTertiaryColor: "#1c2128",
  accentBackgroundColor: "#1c2d3f",
  headerBackgroundColor: "#161b22",
  cellSelectedBackgroundColor: "#1c2d3f",
  rowHoverColor: "rgba(177,186,196,0.06)",

  cellTextColor: "#c9d1d9",
  headerTextColor: "#e6edf3",
  cellSelectedTextColor: "#ffffff",
  mutedTextColor: "#8b949e",

  accentColor: "#539bf5",
  accentHoverColor: "rgba(83,155,245,0.15)",

  borderColor: "#21262d",
  separatorColor: "#21262d",
  borderWidth: 1,
  headerBorderWidth: 1,
  borderRadius: 2,

  dangerColor: "#f85149",

  sortIconColor: "#8b949e",
  filterActiveColor: "#539bf5",
  groupExpandIconColor: "#c9d1d9",

  checkboxCheckedColor: "#539bf5",
  checkboxUncheckedColor: "#21262d",
  checkboxPartialColor: "#539bf5",

  fontFamily: "System",
  fontSize: 14,
  headerFontSize: 13,
  headerFontWeight: "bold",

  cellPadding: 6,
  headerPadding: 6,
  rowHeight: 30,
  headerHeight: 28,

  direction: "ltr",
};
