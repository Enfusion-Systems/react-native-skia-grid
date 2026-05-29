import {
  FlexGrowContentScrollView,
} from "../../slots/defaults";
import { useCommonStyles } from "../../slots/defaults";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as React from "react";
import { View } from "react-native";

import type {
  CombinedFilterModel,
  FilterParams,
  MultiFilterParams,
  SetFilterParams,
  SetFilterType,
  SkiaInternalGridColumn,
} from "../../../core/types";
import type { GridContextSnapshot } from "../../context";
import { StyledTopBar } from "../shared/formActionStyles";
import { ConditionsList } from "./ConditionsList";
import { SetFilter } from "./SetFilter";
import { useHandleFilterChange } from "./hooks/useHandleFilterChange";

type ActionsStackParamList = { ActionsMenu: {}; Filters: {} };

export type FiltersNavigationProp = NativeStackNavigationProp<
  ActionsStackParamList,
  "Filters"
>;

export const FilterMenu: React.FC<{
  column: SkiaInternalGridColumn;
  filterKey: string;
  onBackClick: VoidFunction;
  useGridActions: () => GridContextSnapshot;
}> = ({ column, filterKey, onBackClick, useGridActions }) => {
  const cs = useCommonStyles();

  const columnFilters = React.useMemo(() => {
    if (column?.filterType) {
      return column?.filterType === "multi"
        ? (column?.filterParams as MultiFilterParams)?.filters
        : [
            {
              filterParams: column.filterParams as FilterParams,
              filterType: column.filterType,
            },
          ];
    }
  }, [column]);

  const handleFilterChange = useHandleFilterChange(
    filterKey,
    column,
    useGridActions
  );

  return (
    <View>
      <StyledTopBar title="Filters" onBackClick={onBackClick} />
      <FlexGrowContentScrollView bottomContentInset={false}>
        <View style={cs.flexOne}>
          {columnFilters?.map((colFilter, idx) =>
            colFilter?.filterType !== "set" ? (
              <ConditionsList
                filterParams={colFilter?.filterParams as FilterParams}
                filterType={
                  colFilter?.filterType !== "multi"
                    ? colFilter?.filterType
                    : null
                }
                onConditionalFilterChange={(
                  filter: CombinedFilterModel | null
                ) => handleFilterChange(idx, filter)}
                key={filterKey}
                index={idx}
                useGridActions={useGridActions}
                filterKey={filterKey!}
              />
            ) : (
              <View style={cs.flexOne} key={idx}>
                <SetFilter
                  index={idx}
                  onSetFilterChange={(filter: SetFilterType | null) =>
                    handleFilterChange(idx, filter)
                  }
                  filterParams={colFilter.filterParams as SetFilterParams}
                  useGridActions={useGridActions}
                  filterKey={filterKey!}
                />
              </View>
            )
          )}
        </View>
      </FlexGrowContentScrollView>
    </View>
  );
};
