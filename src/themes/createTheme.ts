import type { GridTheme, GridThemeTokens } from "./tokens";
import { DEFAULT_TOKENS } from "./tokens";

export function createTheme(
  overrides: Partial<GridThemeTokens> = {}
): GridTheme {
  const merged: GridThemeTokens = { ...DEFAULT_TOKENS, ...overrides };

  // Cascading defaults
  merged.headerBackgroundColor ??= merged.backgroundColor;
  merged.headerTextColor ??= merged.cellTextColor;
  merged.cellSelectedTextColor ??= merged.cellTextColor;
  merged.rowAlternateBackgroundColor ??= merged.backgroundColor;
  merged.separatorColor ??= merged.borderColor;
  merged.sortIconColor ??= merged.mutedTextColor;
  merged.filterActiveColor ??= merged.accentColor;
  merged.groupExpandIconColor ??= merged.cellTextColor;
  merged.checkboxCheckedColor ??= merged.accentColor;
  merged.checkboxUncheckedColor ??= merged.borderColor;
  merged.checkboxPartialColor ??= merged.checkboxCheckedColor;
  merged.rowHoverColor ??= merged.backgroundHoverColor;
  merged.cellSelectedBackgroundColor ??= merged.accentBackgroundColor;

  return Object.freeze({
    ...merged,
    withOverrides(o: Partial<GridThemeTokens>): GridTheme {
      return createTheme({ ...merged, ...o });
    },
  });
}
