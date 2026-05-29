import * as React from "react";

import type { GridTheme } from "./tokens";

type GridThemeContextValue = {
  theme: GridTheme;
};

const GridThemeContext = React.createContext<GridThemeContextValue | null>(null);

type GridThemeProviderProps = {
  theme: GridTheme;
  children: React.ReactNode;
};

export function GridThemeProvider({ theme, children }: GridThemeProviderProps) {
  // Defer theme propagation so urgent renders (gestures, taps, input) complete
  // with the previous theme before the 8-layer picture re-record cascade runs.
  // React picks up the new theme during idle time, keeping the moment of the
  // theme toggle responsive to the user. See docs/performance-optimizations.md.
  const deferredTheme = React.useDeferredValue(theme);
  const value = React.useMemo(
    () => ({ theme: deferredTheme }),
    [deferredTheme]
  );

  return (
    <GridThemeContext.Provider value={value}>{children}</GridThemeContext.Provider>
  );
}

export function useGridTheme(): GridTheme {
  const ctx = React.useContext(GridThemeContext);
  if (!ctx) {
    // Lazy import to avoid circular dependency at module load time
    const { darkTheme } = require("./presets/dark");
    return darkTheme;
  }
  return ctx.theme;
}

export { GridThemeContext };
