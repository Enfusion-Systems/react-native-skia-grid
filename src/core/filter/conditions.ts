import type {
  ColumnFilterState,
  CombinedFilterModel,
  FilterModel,
  FilterType,
  JoinOperator,
  SimpleFilterParams,
  SimpleFilterType,
} from "../types";
import { FilterTypes, JoinOperators, SimpleFilterTypes } from "../types";

export type ConditionFilterType = Exclude<FilterType, "multi" | "set"> | null;

export type CombinedFilterDefaults = {
  maxNumConditions: number;
  defaultJoinOperator: JoinOperator;
  defaultOption: SimpleFilterType;
};

export function resolveFilterParamDefaults(
  filterParams: SimpleFilterParams | undefined,
  filterType: ConditionFilterType
): CombinedFilterDefaults {
  const {
    maxNumConditions = 4,
    defaultJoinOperator = JoinOperators.OR,
    defaultOption = filterType === "text"
      ? SimpleFilterTypes.StartsWith
      : SimpleFilterTypes.Equals,
  } = (filterParams ?? {}) as SimpleFilterParams;

  return { maxNumConditions, defaultJoinOperator, defaultOption };
}

export function makeDefaultCombinedFilter(
  filterType: ConditionFilterType,
  defaultOption: SimpleFilterType,
  defaultJoinOperator: JoinOperator
): CombinedFilterModel {
  return {
    conditions: [
      { type: defaultOption, filterType: filterType ?? FilterTypes.Text },
    ],
    joinOperator: defaultJoinOperator,
  };
}

export function appendEmptyConditionIfNeeded(
  filter: CombinedFilterModel,
  opts: {
    maxNumConditions: number;
    defaultOption: SimpleFilterType;
    filterType: ConditionFilterType;
  }
): CombinedFilterModel {
  const { maxNumConditions, defaultOption, filterType } = opts;
  const conditions = filter.conditions;
  const last = conditions[conditions.length - 1];

  const shouldAppend =
    conditions.length === 0 ||
    (conditions.length < maxNumConditions &&
      (last?.filter?.toString().length ||
        last?.filterTo?.toString().length));

  if (!shouldAppend) return filter;

  return {
    ...filter,
    conditions: [
      ...conditions,
      { type: defaultOption, filterType: filterType ?? FilterTypes.Text },
    ],
  };
}

export function removeEmptyConditions(
  conditions: FilterModel[]
): FilterModel[] {
  return conditions.filter(
    (condition) =>
      condition.filter?.toString().length ||
      condition.filterTo?.toString().length ||
      condition.type === SimpleFilterTypes.Blank ||
      condition.type === SimpleFilterTypes.NotBlank
  );
}

export function getInitialCombinedFilter(
  filterState: Map<string, ColumnFilterState>,
  filterKey: string,
  index: number,
  defaults: CombinedFilterDefaults & { filterType: ConditionFilterType }
): CombinedFilterModel {
  const fromState = filterState.get(filterKey)?.filters?.[index] as
    | CombinedFilterModel
    | undefined;

  const base =
    fromState ??
    makeDefaultCombinedFilter(
      defaults.filterType,
      defaults.defaultOption,
      defaults.defaultJoinOperator
    );

  return appendEmptyConditionIfNeeded(base, {
    maxNumConditions: defaults.maxNumConditions,
    defaultOption: defaults.defaultOption,
    filterType: defaults.filterType,
  });
}
