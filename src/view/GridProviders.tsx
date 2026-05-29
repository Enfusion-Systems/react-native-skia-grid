import * as React from "react";

import {
  GridActionsContext,
  GridColumnsContext,
  GridLayoutContext,
  GridSelectionContext,
  type GridActionsContextState,
  type GridColumnsContextState,
  type GridLayoutContextState,
  type GridSelectionContextState,
} from "./context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GridProvidersProps<T extends Object = any> = {
  layout: GridLayoutContextState<T>;
  columns: GridColumnsContextState<T>;
  actions: GridActionsContextState<T>;
  selection: GridSelectionContextState<T>;
  children: React.ReactNode;
};

// Flattens the 4-context provider stack into a single component so DataGrid's
// JSX doesn't carry the nesting. Ordering is fixed here intentionally — any
// future context that depends on another should slot in at the right depth.
export function GridProviders<T extends Object>({
  layout,
  columns,
  actions,
  selection,
  children,
}: GridProvidersProps<T>) {
  return (
    <GridLayoutContext.Provider value={layout}>
      <GridColumnsContext.Provider value={columns}>
        <GridActionsContext.Provider value={actions}>
          <GridSelectionContext.Provider value={selection}>
            {children}
          </GridSelectionContext.Provider>
        </GridActionsContext.Provider>
      </GridColumnsContext.Provider>
    </GridLayoutContext.Provider>
  );
}
