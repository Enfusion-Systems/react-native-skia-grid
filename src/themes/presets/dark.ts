import { createTheme } from "../createTheme";

/**
 * Professional dark theme — financial-grade.
 * Deep navy-black backgrounds, precise hairline borders,
 * professional blue accent, clean gray typography.
 */
export const darkTheme = createTheme({
  backgroundColor: "#0d1117",
  backgroundHoverColor: "rgba(177,186,196,0.06)",
  rowAlternateBackgroundColor: "#111318",
  backgroundTertiaryColor: "#1c2128",
  accentBackgroundColor: "#1c2d3f",
  headerBackgroundColor: "#161b22",

  cellTextColor: "#c9d1d9",
  headerTextColor: "#e6edf3",
  cellSelectedTextColor: "#ffffff",
  mutedTextColor: "#8b949e",

  accentColor: "#539bf5",
  accentHoverColor: "rgba(83,155,245,0.15)",

  borderColor: "#21262d",
  separatorColor: "#21262d",

  dangerColor: "#f85149",

  sortIconColor: "#8b949e",
  filterActiveColor: "#539bf5",
  checkboxCheckedColor: "#539bf5",

  fontFamily: "System",
  fontSize: 14,
  headerFontSize: 13,
  headerFontWeight: "bold",

  cellPadding: 6,
  headerPadding: 6,
  rowHeight: 30,
  headerHeight: 28,

  borderWidth: 1,
  headerBorderWidth: 1,
  borderRadius: 2,
});
