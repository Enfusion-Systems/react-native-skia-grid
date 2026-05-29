/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: incrementally remove per-line */
import type {
  FilterButtonType,
  FilterType,
  JoinOperator,
  SimpleFilterType,
} from "./constants";

// CUSTOM FILTER OPTION // not necessary for now
export type FilterOptionDef = {
  /** A unique key that does not clash with the built-in filter keys. */
  // remaining to handle
  displayKey: string;

  /** Display name for the filter. Can be replaced by a locale-specific value using a `localeTextFunc`. */
  // remaining to handle
  displayName: string;

  /** Custom filter logic that returns a boolean based on the `filterValues` and `cellValue`. */
  // remaining to handle
  predicate?: (filterValues: any[], cellValue: any) => boolean;

  /** Number of inputs to display for this option. Defaults to `1` if unspecified. */
  // remaining to handle
  numberOfInputs?: 0 | 1 | 2;
};

export type ProvidedFilterParams = {
  buttons?: FilterButtonType[];
  closeOnApply?: boolean;
  debounceMs?: number;
};

export type SetFilterParams = ProvidedFilterParams & {
  refreshValuesOnOpen?: boolean;
  suppressSelectAll?: boolean;
  defaultToNothingSelected?: boolean;
  showSearchField?: boolean;
  searchFieldOptions?: { caseSensitive?: boolean; allowNegative?: boolean };
};

export type SimpleFilterParams = ProvidedFilterParams & {
  // TODO: implement the custom filter options
  filterOptions?: (FilterOptionDef | SimpleFilterType)[];
  defaultOption?: SimpleFilterType;
  defaultJoinOperator?: JoinOperator;
  maxNumConditions?: number;
  /**
   * By default only one condition is shown, and additional conditions are made visible when the previous conditions are entered
   * (up to `maxNumConditions`). To have more conditions shown by default, set this to the number required.
   * Conditions will be disabled until the previous conditions have been entered.
   * Note that this cannot be greater than `maxNumConditions` - anything larger will be ignored.
   * Default: `1`
   */
  // remaining to handle
  numAlwaysVisibleConditions?: number;
  filterPlaceholder?: string;
  filterValueGetter?: (
    value?: string | number | Date | null
  ) => string | number | Date | null;
};

export type TextMatcherParams = {
  /**
   * The applicable filter option being tested.
   * One of: `equals`, `notEqual`, `contains`, `notContains`, `startsWith`, `endsWith`.
   */
  filterOption: string | null | undefined;
  value: any;
  filterText: string | null;
  textFormatter?: (from: string) => string | null;
};

export type TextFilterParams = SimpleFilterParams & {
  textMatcher?: (params: TextMatcherParams) => boolean;
  caseSensitive?: boolean;
  textFormatter?: (from: string) => string | null;
  trimInput?: boolean;
};

export type ScalarFilterParams = SimpleFilterParams & {
  inRangeInclusive?: boolean;
  includeBlanksInEquals?: boolean;
  includeBlanksInLessThan?: boolean;
  includeBlanksInGreaterThan?: boolean;
  includeBlanksInRange?: boolean;
};

export type DateFilterParams = ScalarFilterParams & {
  // remaining to handle
  comparator?: (
    filterDate: Date | string | null,
    cellValue: Date | string | null
  ) => number;
  minValidYear?: number;
  maxValidYear?: number;
  mode: "date" | "time" | "datetime";
  dateFormatter?: (text: string | null) => Date | string | null;
};

export interface NumberFilterParams extends ScalarFilterParams {
  /**
   * When specified, the input field will be of type `text`, and this will be used as a regex of all the characters that are allowed to be typed.
   * This will be compared against any typed character and prevent the character from appearing in the input if it does not match.
   */
  // remaining to handle
  allowedCharPattern?: string;
  numberFormatter?: (text: string | null) => number | string | null;
  comparator?: (
    filterDate: string | number,
    cellValue: string | number | null
  ) => number;
}

export type FilterParams =
  | TextFilterParams
  | SetFilterParams
  | NumberFilterParams
  | DateFilterParams;

export type MultiFilterParams = {
  filters?: { filterParams?: FilterParams; filterType: FilterType }[];
};

export type FilterModel = {
  type: SimpleFilterType;
  filterType: Exclude<FilterType, "multi" | "set">;
  filter?: string | number | Date | null;
  //required when date range/number range/custom filter type is used
  filterTo?: string | number | Date | null;
};

export type CombinedFilterModel = {
  joinOperator: JoinOperator;
  conditions: FilterModel[];
  filterType?: Exclude<FilterType, "multi" | "set">;
};

export type SetFilterType = {
  values?: string[] | number[] | Date[] | null;
  filterType?: "set";
};

export type ColumnFilterState = {
  id: string;
  filterIndex: number;
  filterType?: FilterType;
  filters: Array<CombinedFilterModel | SetFilterType | null>;
};
