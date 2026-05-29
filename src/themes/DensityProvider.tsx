import * as React from "react";
import { type Density, type Tokens, getTokens } from "./density";
import { type GridStyles, computeGridStyles } from "./gridStyles";
import { useGridTheme } from "./GridThemeProvider";
import { darkTheme } from "./presets/dark";

const MEDIUM_TOKENS = getTokens("medium");
const MEDIUM_STYLES = computeGridStyles(MEDIUM_TOKENS, darkTheme);

const DensityContext = React.createContext<Tokens>(MEDIUM_TOKENS);
const GridStylesContext = React.createContext<GridStyles>(MEDIUM_STYLES);

type DensityProviderProps = React.PropsWithChildren<{
  density: Density;
}>;

export function DensityProvider({ density, children }: DensityProviderProps) {
  const theme = useGridTheme();
  const t = React.useMemo(() => getTokens(density), [density]);
  const styles = React.useMemo(() => computeGridStyles(t, theme), [t, theme]);

  return (
    <DensityContext.Provider value={t}>
      <GridStylesContext.Provider value={styles}>
        {children}
      </GridStylesContext.Provider>
    </DensityContext.Provider>
  );
}

export function useTokens(): Tokens {
  return React.useContext(DensityContext);
}

export function useGridStyles(): GridStyles {
  return React.useContext(GridStylesContext);
}
