import { createTheme } from "../createTheme";

/**
 * Professional light theme — financial-grade.
 * Clean whites, precise slate borders, GitHub light / Refinitiv-inspired.
 */
export const lightTheme = createTheme({
  backgroundColor: "#ffffff",
  backgroundHoverColor: "rgba(31,35,40,0.04)",
  rowAlternateBackgroundColor: "#f6f8fa",
  backgroundTertiaryColor: "#eaeef2",
  accentBackgroundColor: "#ddf4ff",
  headerBackgroundColor: "#f6f8fa",

  cellTextColor: "#1f2328",
  headerTextColor: "#1f2328",
  cellSelectedTextColor: "#0550ae",
  mutedTextColor: "#656d76",

  accentColor: "#0969da",
  accentHoverColor: "rgba(9,105,218,0.1)",

  borderColor: "#d0d7de",
  separatorColor: "#d0d7de",

  dangerColor: "#cf222e",

  sortIconColor: "#656d76",
  filterActiveColor: "#0969da",
  checkboxCheckedColor: "#0969da",

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
