import type { ColumnChooserColumn } from "./types";
import { noop } from "lodash";
import * as React from "react";

export type ColumnContextState = {
  add?: (def: ColumnChooserColumn[]) => void;
  availableColumns?: ColumnChooserColumn[];
  filterMenuOpen?: () => void;
  columnFilters?: Record<string, boolean>;
  handleCheckedChange?: (def: ColumnChooserColumn) => void;
};

export const ColumnContext = React.createContext<ColumnContextState>({
  add: noop,
  availableColumns: [],
  filterMenuOpen: noop,
  columnFilters: {},
  handleCheckedChange: noop,
});
