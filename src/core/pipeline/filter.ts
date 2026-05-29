import { parseISO } from "date-fns";
import { get } from "lodash";

import { getUTCDate } from "../../internal/utils";
import type {
  ColumnFilterState,
  CombinedFilterModel,
  DateFilterParams,
  FilterModel,
  FilterParams,
  FilterType,
  MultiFilterParams,
  NumberFilterParams,
  RowNode,
  ScalarFilterParams,
  SetFilterType,
  SimpleFilterParams,
  SimpleFilterType,
  SkiaInternalGridColumn,
  TextFilterParams,
  TextMatcherParams,
} from "../types";
import { FilterTypes, JoinOperators, SimpleFilterTypes } from "../types";
import { getDisplayValue, getFilterKey } from "../../utils/gridUtils";

const TEXT_DEFAULT_MATCHER = ({
  filterOption,
  value,
  filterText,
}: TextMatcherParams) => {
  if (filterText === null) {
    return false;
  }
  switch (filterOption) {
    case SimpleFilterTypes.Contains:
      return value.indexOf(filterText) >= 0;
    case SimpleFilterTypes.NotContains:
      return value.indexOf(filterText) < 0;
    case SimpleFilterTypes.Equals:
      return value === filterText;
    case SimpleFilterTypes.NotEqual:
      return value !== filterText;
    case SimpleFilterTypes.StartsWith:
      return value.indexOf(filterText) === 0;
    case SimpleFilterTypes.EndsWith:
      const index = value.lastIndexOf(filterText);
      return index >= 0 && index === value.length - filterText.length;
    case SimpleFilterTypes.Blank:
      return value === "";
    case SimpleFilterTypes.NotBlank:
      return value !== "";
    default:
      return false;
  }
};

const DEFAULT_NUMBER_PARSER = (val: string | number | null) => {
  if (typeof val === "number") return val;
  const numericVal = Number.parseFloat(val || "");
  return !Number.isNaN(numericVal) ? numericVal : null;
};

const DEFAULT_DATE_PARSER = (val: string | null) => parseISO(val as string);

const evaluateNullValue = (
  filterType: SimpleFilterType,
  scalarFilterParams: ScalarFilterParams
) => {
  switch (filterType) {
    case SimpleFilterTypes.Equals:
    case SimpleFilterTypes.NotEqual:
      if (scalarFilterParams.includeBlanksInEquals) {
        return true;
      }
      break;
    case SimpleFilterTypes.GreaterThan:
    case SimpleFilterTypes.GreaterThanOrEqual:
      if (scalarFilterParams.includeBlanksInGreaterThan) {
        return true;
      }
      break;

    case SimpleFilterTypes.LessThan:
    case SimpleFilterTypes.LessThanOrEqual:
      if (scalarFilterParams.includeBlanksInLessThan) {
        return true;
      }
      break;
    case SimpleFilterTypes.InRange:
      if (scalarFilterParams.includeBlanksInRange) {
        return true;
      }
      break;
    case SimpleFilterTypes.Blank:
      return true;
    case SimpleFilterTypes.NotBlank:
      return false;
  }

  return false;
};

const evaluateNonNullValue = (
  filterType: SimpleFilterType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comparator: (a: any, b: any) => number,
  cellValue: string | Date | number,
  values: (string | number | Date | null | undefined)[],
  inRangeInclusive?: boolean
) => {
  const compareResult =
    values[0] != null ? comparator(cellValue, values[0]!) : 0;

  switch (filterType) {
    case SimpleFilterTypes.Equals:
      return compareResult === 0;

    case SimpleFilterTypes.NotEqual:
      return compareResult !== 0;

    case SimpleFilterTypes.GreaterThan:
      return compareResult > 0;

    case SimpleFilterTypes.GreaterThanOrEqual:
      return compareResult >= 0;

    case SimpleFilterTypes.LessThan:
      return compareResult < 0;

    case SimpleFilterTypes.LessThanOrEqual:
      return compareResult <= 0;

    case SimpleFilterTypes.InRange: {
      const compareToResult = comparator(cellValue, values[1]!);

      return inRangeInclusive
        ? compareResult >= 0 && compareToResult <= 0
        : compareResult > 0 && compareToResult < 0;
    }

    case SimpleFilterTypes.Blank:
      return cellValue == null;

    case SimpleFilterTypes.NotBlank:
      return !!cellValue;

    default:
      console.warn(
        'Unexpected type of filter "' +
          filterType +
          '", it looks like the filter was configured with incorrect Filter Options'
      );
      return true;
  }
};

const DEFAULT_DATE_COMPARATOR =
  (mode: "date" | "time" | "datetime") =>
  (filterDate: Date | string | null, cellValue: Date | string | null) => {
    if (!filterDate || !cellValue) {
      return 0;
    }
    if (mode === "date") {
      const filterValue = getUTCDate(new Date(filterDate));
      const valueToCompare = getUTCDate(new Date(cellValue));
      return filterValue?.getTime() - valueToCompare.getTime();
    } else {
      const filterValue = parseISO(filterDate as string);
      const valueToCompare = parseISO(cellValue as string);
      return filterValue?.getTime() - valueToCompare.getTime();
    }
  };

const NUMBER_COMPARATOR = (a: number | string, b: number | string) => {
  if (typeof a === "object" || typeof b === "object") return 0;
  else if (typeof a === "number" && typeof b === "number") return a - b;
  else if (typeof a === "string" && typeof b === "string")
    return Number.parseFloat(a) - Number.parseFloat(b);
  return 0;
};

function evalFilter<T extends Object>(
  combinedFilter: CombinedFilterModel,
  createEval: (rowNode: RowNode<T>) => (condition: FilterModel) => boolean
) {
  const conditions = combinedFilter.conditions.filter(
    (condition) =>
      condition.type === SimpleFilterTypes.Blank ||
      condition.type === SimpleFilterTypes.NotBlank ||
      condition.filter != null ||
      condition.filterTo != null
  );
  return (rowNode: RowNode<T>) => {
    if (!conditions.length) return true;

    const evaluateFunction = createEval(rowNode);
    if (combinedFilter.joinOperator === JoinOperators.OR)
      return conditions.some(evaluateFunction);
    return conditions.every(evaluateFunction);
  };
}

export const getFilteringFunction = <T extends Object>(
  combinedFilter: CombinedFilterModel,
  column: SkiaInternalGridColumn<T>,
  filter: FilterType = FilterTypes.Text,
  filterParams: FilterParams | MultiFilterParams = {}
) => {
  function getFormattedValue(condition: FilterModel) {
    const { filterValueGetter } = filterParams as SimpleFilterParams;
    return {
      filter: filterValueGetter?.(condition.filter) ?? condition.filter,
      filterTo: filterValueGetter?.(condition.filterTo) ?? condition.filterTo,
    };
  }

  switch (filter) {
    case FilterTypes.Text: {
      const {
        textFormatter,
        caseSensitive = false,
        trimInput = false,
        textMatcher = TEXT_DEFAULT_MATCHER,
      } = filterParams as TextFilterParams;
      const conditions = combinedFilter?.conditions?.filter(
        (condition) =>
          condition.type === SimpleFilterTypes.Blank ||
          condition.type === SimpleFilterTypes.NotBlank ||
          condition.filter != null ||
          condition.filterTo != null
      );
      return (rowNode: RowNode<T>) => {
        if (!conditions?.length) return true;

        let val = textFormatter
          ? textFormatter(get(rowNode.data, column.field))
          : getDisplayValue(column, rowNode)[0]?.toString() ?? "";

        val = trimInput && val.trim().length !== 0 ? val.trim() : val;
        val = caseSensitive ? val : val?.toLowerCase();

        const matchingFunction = (condition: FilterModel) => {
          return textMatcher({
            filterOption: condition.type,
            filterText: caseSensitive
              ? condition.filter?.toString() ?? ""
              : condition.filter?.toString()?.toLowerCase() ?? "",
            value: val,
          });
        };
        if (combinedFilter.joinOperator === JoinOperators.OR) {
          return conditions.some(matchingFunction);
        } else return conditions.every(matchingFunction);
      };
    }
    case FilterTypes.Number: {
      const {
        numberFormatter,
        comparator = NUMBER_COMPARATOR,
        inRangeInclusive,
        includeBlanksInEquals,
        includeBlanksInGreaterThan,
        includeBlanksInLessThan,
        includeBlanksInRange,
      } = filterParams as NumberFilterParams;

      return evalFilter(combinedFilter, (rowNode: RowNode<T>) => {
        const formattedValue = numberFormatter
          ? numberFormatter(get(rowNode.data, column.field))
          : getDisplayValue(column, rowNode)[0] ??
            DEFAULT_NUMBER_PARSER(get(rowNode.data, column.field));

        const val =
          typeof formattedValue === "number"
            ? formattedValue
            : formattedValue?.replace(/[,%]/g, "")
            ? Number(formattedValue?.replace(/[,%]/g, ""))
            : NaN;

        return (condition: FilterModel) => {
          const { filter, filterTo } = getFormattedValue(condition);

          if (val || val === 0)
            return evaluateNonNullValue(
              condition.type,
              comparator,
              val,
              [filter, filterTo],
              inRangeInclusive
            );
          else
            return evaluateNullValue(condition.type, {
              inRangeInclusive,
              includeBlanksInEquals,
              includeBlanksInGreaterThan,
              includeBlanksInLessThan,
              includeBlanksInRange,
            });
        };
      });
    }
    case FilterTypes.Date: {
      const {
        comparator,
        dateFormatter,
        inRangeInclusive,
        includeBlanksInEquals,
        includeBlanksInGreaterThan,
        includeBlanksInLessThan,
        includeBlanksInRange,
        mode,
      } = filterParams as DateFilterParams;

      return evalFilter<T>(combinedFilter, (rowNode) => {
        const val = dateFormatter
          ? dateFormatter(get(rowNode.data, column.field))
          : getDisplayValue<T>(column, rowNode)[0] ??
            DEFAULT_DATE_PARSER(get(rowNode.data, column.field));

        const dateComparator = comparator ?? DEFAULT_DATE_COMPARATOR(mode);
        return (condition: FilterModel) => {
          const { filter, filterTo } = getFormattedValue(condition);
          if (val)
            return evaluateNonNullValue(
              condition.type,
              dateComparator,
              val,
              [filter, filterTo],
              inRangeInclusive
            );
          return evaluateNullValue(condition.type, {
            inRangeInclusive,
            includeBlanksInEquals,
            includeBlanksInGreaterThan,
            includeBlanksInLessThan,
            includeBlanksInRange,
          });
        };
      });
    }

    default:
      return () => true;
  }
};

export const getFilteredRows = <T extends Object>(
  rowsData: RowNode<T>[],
  filterState: Map<string, ColumnFilterState>,
  columns: SkiaInternalGridColumn<T>[]
): RowNode<T>[] => {
  let filteredRows = [...rowsData];

  if (filterState.size) {
    filterState.forEach((columnFilterState, key) => {
      const column = columns.find((col) => getFilterKey(col) === key);

      if (!column) return;
      columnFilterState.filters?.forEach((value, index) => {
        if (!value) return;

        let filter = column.filterType;
        let filterParams = column.filterParams;
        if (column.filterType === FilterTypes.Multi) {
          const entry = (column.filterParams as MultiFilterParams)?.filters?.[
            index
          ];
          filter = entry?.filterType;
          filterParams = entry?.filterParams;
        }
        let filterFunction;

        if (filter === FilterTypes.Set) {
          filteredRows = filteredRows.filter((rowNode) => {
            let val = getDisplayValue(column, rowNode)[0];
            const setFilters = (value as SetFilterType).values;
            return setFilters
              ? ((value as SetFilterType).values ?? [])?.some(
                  (item) => item === val
                )
              : true;
          });
        } else {
          filterFunction = getFilteringFunction(
            value as CombinedFilterModel,
            column,
            filter,
            filterParams
          );
          filteredRows = filteredRows.filter(filterFunction);
        }
      });
    });
  }
  return filteredRows;
};
