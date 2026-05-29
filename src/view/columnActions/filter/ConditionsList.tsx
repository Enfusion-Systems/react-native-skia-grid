import { useRefCallback } from "../../../internal/hooks";
import { useSlots } from "../../slots";
// Specialized filter input components - thin wrappers
import {
  ButtonGroupSelect,
  DatePickerInput,
  NumericInput,
  Select,
} from "../../slots/defaults/filterInputs";
import * as React from "react";
import { View, ViewProps } from "react-native";

import { useGridStyles } from "../../../themes";

import {
  type CombinedFilterModel,
  type DateFilterParams,
  type FilterModel,
  type FilterType as BaseFilterType,
  type NumberFilterParams,
  type SimpleFilterParams,
  type SimpleFilterType,
  type TextFilterParams,
  FilterTypes,
  JoinOperators,
  SimpleFilterTypes,
} from "../../../core/types";
import { createOptions } from "../../../utils/gridUtils";
import type { GridContextSnapshot } from "../../context";
import { useConditionsList } from "./hooks/useConditionsList";

const DEFAULT_TEXT_FILTER_OPTIONS = createOptions<SimpleFilterType>([
  SimpleFilterTypes.Equals,
  SimpleFilterTypes.NotEqual,
  SimpleFilterTypes.Contains,
  SimpleFilterTypes.NotContains,
  SimpleFilterTypes.StartsWith,
  SimpleFilterTypes.EndsWith,
  SimpleFilterTypes.Blank,
  SimpleFilterTypes.NotBlank,
]);
const DEFAULT_DATE_FILTER_OPTIONS = createOptions<SimpleFilterType>([
  SimpleFilterTypes.Equals,
  SimpleFilterTypes.NotEqual,
  SimpleFilterTypes.GreaterThan,
  SimpleFilterTypes.LessThan,
  SimpleFilterTypes.InRange,
  SimpleFilterTypes.Blank,
  SimpleFilterTypes.NotBlank,
]);

const DEFAULT_NUMBER_FILTER_OPTIONS = createOptions<SimpleFilterType>([
  SimpleFilterTypes.Equals,
  SimpleFilterTypes.NotEqual,
  SimpleFilterTypes.GreaterThan,
  SimpleFilterTypes.GreaterThanOrEqual,
  SimpleFilterTypes.LessThan,
  SimpleFilterTypes.LessThanOrEqual,
  SimpleFilterTypes.InRange,
  SimpleFilterTypes.Blank,
  SimpleFilterTypes.NotBlank,
]);

const FILTER_OPTIONS = {
  text: DEFAULT_TEXT_FILTER_OPTIONS,
  date: DEFAULT_DATE_FILTER_OPTIONS,
  number: DEFAULT_NUMBER_FILTER_OPTIONS,
} as const;

type FilterParams = TextFilterParams | NumberFilterParams | DateFilterParams;
type FilterType = Exclude<BaseFilterType, "set" | "multi"> | null;

const JoinOperatorOptions = createOptions([
  JoinOperators.AND,
  JoinOperators.OR,
]);

export const ConditionsList: React.FC<{
  filterParams: FilterParams;
  filterType: FilterType;
  index: number;
  onConditionalFilterChange: (filter: CombinedFilterModel | null) => void;
  useGridActions: () => GridContextSnapshot;
  filterKey: string;
}> = ({
  filterParams,
  filterType,
  index,
  onConditionalFilterChange,
  useGridActions,
  filterKey,
}) => {
  const { combinedFilter, onConditionChange, onOperatorChange } =
    useConditionsList({
      filterParams: filterParams as SimpleFilterParams | undefined,
      filterType,
      filterKey,
      index,
      onConditionalFilterChange,
      useGridActions,
    });

  return (
    <>
      {combinedFilter?.conditions?.map((condition, idx) => (
        <View key={idx}>
          {idx > 0 && (
            <ConditionsJoinRow>
              <ButtonGroupSelect
                onChange={onOperatorChange}
                options={JoinOperatorOptions}
                disabled={idx > 1}
                value={combinedFilter.joinOperator}
              />
            </ConditionsJoinRow>
          )}
          <ConditionInput
            index={idx}
            condition={condition}
            onChange={onConditionChange(idx)}
            filterParams={filterParams}
            filterType={filterType}
          />
        </View>
      ))}
    </>
  );
};

function ConditionsJoinRow({ children }: ViewProps) {
  const { conditions } = useGridStyles();
  return <View style={conditions.joinRow}>{children}</View>;
}

function ConditionContainer({ children }: ViewProps) {
  const { conditions } = useGridStyles();
  return <View style={conditions.container}>{children}</View>;
}

const ConditionInput: React.FC<{
  index: number;
  filterType?: FilterType;
  condition: FilterModel;
  onChange: (condition: FilterModel) => void;
  filterParams?: TextFilterParams | NumberFilterParams | DateFilterParams;
}> = ({ condition, onChange, filterParams, filterType }) => {
  const { TextInput } = useSlots();
  const onFilterTypeChange = useRefCallback(
    (type: SimpleFilterType) => {
      onChange({ ...condition, type });
    },
    [onChange, condition]
  );

  const onFilterChange = useRefCallback(
    (value: string | number | Date | null) => {
      const filterValue =
        filterType === FilterTypes.Text
          ? value
          : filterType === FilterTypes.Number && value != null
          ? Number(value)
          : value;
      onChange({ ...condition, filter: filterValue });
    },
    [filterType, condition]
  );

  const onClearValue = useRefCallback(() => {
    onChange({ ...condition, filter: null });
  }, [condition]);

  const onFilterToChange = useRefCallback(
    (value: string | number | Date | null) => {
      const filterValue =
        filterType === FilterTypes.Number && value != null
          ? Number(value)
          : value;
      onChange({ ...condition, filterTo: filterValue });
    },
    [filterType, condition]
  );

  const { filterOptions, inputField } = React.useMemo(() => {
    let result = {
      filterOptions: filterType ? FILTER_OPTIONS[filterType] : [],
      inputField: null as React.ReactElement | null,
    };

    if (!filterType) return result;

    if (filterParams?.filterOptions?.length) {
      result.filterOptions = result.filterOptions.filter((i) =>
        filterParams.filterOptions?.includes(i.value)
      );
    }

    if (
      !(
        condition.type === SimpleFilterTypes.Blank ||
        condition.type === SimpleFilterTypes.NotBlank
      )
    ) {
      const placeholder = filterParams?.filterPlaceholder ?? "Filter...";
      switch (filterType) {
        case FilterTypes.Text: {
          result.inputField = (
            <TextInput
              placeholder={placeholder}
              value={condition.filter as string | undefined}
              onChangeText={onFilterChange}
              onClearValue={onClearValue}
              clearable
            />
          );
          break;
        }
        case FilterTypes.Number: {
          result.inputField = (
            <>
              <NumericInput
                value={condition.filter?.toString() ?? null}
                placeholder={placeholder}
                onChange={onFilterChange}
                enableOperators
                clearable
              />
              {condition.type === SimpleFilterTypes.InRange && (
                <NumericInput
                  value={condition.filterTo?.toString() ?? null}
                  placeholder={placeholder}
                  onChange={onFilterToChange}
                  enableOperators
                  clearable
                />
              )}
            </>
          );
          break;
        }
        case FilterTypes.Date: {
          const minDate = new Date(
            (filterParams as DateFilterParams)?.minValidYear ?? 0,
            0,
            1
          );
          const maxDate = new Date(
            (filterParams as DateFilterParams)?.maxValidYear ?? 9999,
            11,
            31
          );
          const mode = (filterParams as DateFilterParams)?.mode;
          result.inputField = (
            <>
              <DatePickerInput
                mode={mode}
                placeholder={placeholder}
                value={condition.filter as Date | null}
                onChanged={onFilterChange}
                minimumDate={minDate}
                maximumDate={maxDate}
                clearable
              />
              {condition.type === SimpleFilterTypes.InRange && (
                <DatePickerInput
                  mode={mode}
                  value={condition.filterTo as Date | null}
                  placeholder={placeholder}
                  onChanged={onFilterToChange}
                  minimumDate={minDate}
                  maximumDate={maxDate}
                  clearable
                />
              )}
            </>
          );
        }
      }
    }

    return result;
  }, [filterParams, filterType, condition]);

  return (
    <ConditionContainer>
      <Select
        options={filterOptions}
        value={condition.type}
        onChange={onFilterTypeChange}
      />

      {inputField}
    </ConditionContainer>
  );
};
