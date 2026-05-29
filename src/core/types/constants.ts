import type { ValueOf } from "../../internal/types";
import type { SectionSeparatorKeys } from "./primitives";

export const SectionSeparators: Record<string, SectionSeparatorKeys> = {
  LEFT: "left",
  RIGHT: "right",
};

export const JoinOperators = {
  AND: "AND",
  OR: "OR",
} as const;

export const PanGestures = {
  START: "start",
  ACTIVE: "active",
  END: "end",
} as const;

export const PinnedStatuses = {
  LEFT: "left",
  NONE: "none",
  RIGHT: "right",
} as const;

export const FilterTypes = {
  Multi: "multi",
  Set: "set",
  Number: "number",
  Text: "text",
  Date: "date",
} as const;

export const FilterButtonTypes = {
  Apply: "apply",
  Clear: "clear",
  Reset: "reset",
  Cancel: "cancel",
} as const;

export const SimpleFilterTypes = {
  Empty: "empty",
  Equals: "equals",
  NotEqual: "notEqual",
  LessThan: "lessThan",
  LessThanOrEqual: "lessThanOrEqual",
  GreaterThan: "greaterThan",
  GreaterThanOrEqual: "greaterThanOrEqual",
  InRange: "inRange",
  Contains: "contains",
  NotContains: "notContains",
  StartsWith: "startsWith",
  EndsWith: "endsWith",
  Blank: "blank",
  NotBlank: "notBlank",
} as const;

export const GridFilterTypes = {
  Filter: "filter",
  FilterTo: "filterTo",
} as const;

export type JoinOperator = ValueOf<typeof JoinOperators>;
export type FilterType = ValueOf<typeof FilterTypes>;
export type FilterButtonType = ValueOf<typeof FilterButtonTypes>;
export type SimpleFilterType = ValueOf<typeof SimpleFilterTypes>;
export type PanGesture = ValueOf<typeof PanGestures>;
export type PinnedStatus = ValueOf<typeof PinnedStatuses>;
export type GridFilterType = ValueOf<typeof GridFilterTypes>;
