import * as React from "react";

import { GridThemeProvider, useGridTheme } from "../../themes/GridThemeProvider";
import type { BottomSheetSlotProps, GridSlots } from "./types";

const SlotsContext = React.createContext<GridSlots | null>(null);

export function useSlots(): GridSlots {
  const ctx = React.useContext(SlotsContext);
  if (!ctx) {
    throw new Error(
      "useSlots must be used within a SlotsProvider. Wrap your Grid component tree with <SlotsProvider>."
    );
  }
  return ctx;
}

type SlotsProviderProps = {
  defaults: GridSlots;
  slots?: Partial<GridSlots>;
  children: React.ReactNode;
};

export function SlotsProvider({ defaults, slots, children }: SlotsProviderProps) {
  const merged = React.useMemo(
    () => (slots ? { ...defaults, ...slots } : defaults),
    [slots, defaults]
  );

  // Keep a mutable ref so the bridged BottomSheet always reads the latest
  // slots without recreating the HOC on every render.
  const slotsRef = React.useRef(merged);
  slotsRef.current = merged;

  // Wrap the BottomSheet slot with a context bridge.
  // @gorhom/bottom-sheet renders children through a portal, stripping all
  // React context (GridThemeProvider, SlotsProvider, styled-components
  // ThemeProvider). By injecting providers as *children* of the BottomSheet,
  // they travel through the portal with the content, so any component
  // inside the sheet retains access to theme and slots.
  const value = React.useMemo(() => {
    const Original = merged.BottomSheet;

    const BridgedBottomSheet: React.FC<BottomSheetSlotProps> =
      function BridgedBottomSheet(props) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const theme = useGridTheme();

        return React.createElement(
          Original,
          props,
          React.createElement(
            GridThemeProvider,
            { theme },
            React.createElement(
              SlotsContext.Provider,
              { value: slotsRef.current },
              props.children
            )
          )
        );
      };

    return { ...merged, BottomSheet: BridgedBottomSheet } as GridSlots;
  }, [merged]);

  return React.createElement(SlotsContext.Provider, { value }, children);
}

export { SlotsContext };
