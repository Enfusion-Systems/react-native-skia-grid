import * as React from "react";

import {
  appendEmptyConditionIfNeeded,
  type ConditionFilterType,
  getInitialCombinedFilter,
  removeEmptyConditions,
  resolveFilterParamDefaults,
} from "../../../../core/filter";
import type {
  CombinedFilterModel,
  FilterModel,
  JoinOperator,
  SimpleFilterParams,
} from "../../../../core/types";
import { JoinOperators } from "../../../../core/types";
import { useRefCallback } from "../../../../internal/hooks";
import type { GridContextSnapshot } from "../../../context";

type UseConditionsListArgs = {
  filterParams: SimpleFilterParams | undefined;
  filterType: ConditionFilterType;
  filterKey: string;
  index: number;
  onConditionalFilterChange: (filter: CombinedFilterModel | null) => void;
  useGridActions: () => GridContextSnapshot;
};

export function useConditionsList({
  filterParams,
  filterType,
  filterKey,
  index,
  onConditionalFilterChange,
  useGridActions,
}: UseConditionsListArgs) {
  const { maxNumConditions, defaultJoinOperator, defaultOption } =
    resolveFilterParamDefaults(filterParams, filterType);

  const { filterState, selectedColumn } = useGridActions();

  const [combinedFilter, setCombinedFilter] =
    React.useState<CombinedFilterModel>(() =>
      getInitialCombinedFilter(filterState, filterKey, index, {
        maxNumConditions,
        defaultJoinOperator,
        defaultOption,
        filterType,
      })
    );

  React.useEffect(() => {
    if (selectedColumn) {
      setCombinedFilter(
        getInitialCombinedFilter(filterState, filterKey, index, {
          maxNumConditions,
          defaultJoinOperator,
          defaultOption,
          filterType,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColumn]);

  const onConditionChange = useRefCallback(
    (idx: number) => (condition: FilterModel) => {
      setCombinedFilter((prevState) => {
        const newConditions = [...prevState.conditions];
        newConditions[idx] = condition;
        const newFilter: CombinedFilterModel = {
          ...prevState,
          conditions: newConditions,
        };

        onConditionalFilterChange({
          joinOperator: newFilter.joinOperator,
          conditions: removeEmptyConditions(newFilter.conditions),
          filterType: filterType ?? "text",
        });

        if (idx === newFilter.conditions.length - 1) {
          return appendEmptyConditionIfNeeded(newFilter, {
            maxNumConditions,
            defaultOption,
            filterType,
          });
        }
        return newFilter;
      });
    },
    []
  );

  const onOperatorChange = useRefCallback((operator: string | null) => {
    setCombinedFilter((prevState) => {
      const newFilter: CombinedFilterModel = {
        ...prevState,
        joinOperator: (operator as JoinOperator) ?? JoinOperators.AND,
      };
      onConditionalFilterChange(newFilter);
      return newFilter;
    });
  }, []);

  return { combinedFilter, onConditionChange, onOperatorChange };
}
