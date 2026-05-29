import * as React from "react";

import {
  deriveSetFilterValue,
  getDistinctValuesForColumn,
} from "../../../../core/filter";
import type { SetFilterParams, SetFilterType } from "../../../../core/types";
import { useRefCallback } from "../../../../internal/hooks";
import type { GridContextSnapshot } from "../../../context";
import {
  applySelectAllChecked,
  computeSelectAllCheckedState,
  filterDistinctValuesBySearch,
  toSetItems,
  toggleDistinctValueAt,
} from "../lib/setItemHelpers";
import type { SetItem } from "../lib/types";

type UseSetFilterArgs = {
  index: number;
  filterParams: SetFilterParams;
  filterKey: string;
  useGridActions: () => GridContextSnapshot;
  onSetFilterChange: (filter: SetFilterType | null) => void;
};

export function useSetFilter({
  index,
  filterParams,
  filterKey,
  useGridActions,
  onSetFilterChange,
}: UseSetFilterArgs) {
  const { selectedColumn, rows, rowsData, filterState, columns } =
    useGridActions();

  const [caseSensitive, setCaseSensitive] = React.useState(
    filterParams?.searchFieldOptions?.caseSensitive ?? false
  );
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [distinctValues, setDistinctValues] = React.useState<SetItem[]>([]);
  const [searchText, setSearchText] = React.useState<string>("");

  const selectedValues = selectedColumn
    ? (filterState?.get(filterKey)?.filters?.[index] as SetFilterType)
        ?.values ?? null
    : [];

  React.useEffect(() => {
    if (selectedColumn) {
      const values = getDistinctValuesForColumn({
        rowsData,
        filterState,
        columns,
        selectedColumn,
        filterKey,
        index,
      });
      setDistinctValues(toSetItems(values, selectedValues));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColumn, rows, filterState]);

  const emitFilterFromState = useRefCallback(
    (next: SetItem[]) => {
      const checked = next
        .filter((item) => item.checked)
        .map((item) => item.value as string);
      onSetFilterChange(deriveSetFilterValue(checked, next.length));
      setDistinctValues(next);
    },
    [onSetFilterChange]
  );

  const onCheckedStatusChange = useRefCallback(
    (idx: number) => (checked: boolean) => {
      emitFilterFromState(toggleDistinctValueAt(distinctValues, idx, checked));
    },
    [distinctValues, emitFilterFromState]
  );

  const filteredData = React.useMemo(
    () =>
      filterDistinctValuesBySearch(distinctValues, searchText, caseSensitive),
    [caseSensitive, searchText, distinctValues]
  );

  const selectAll = useRefCallback(
    (checked: boolean) => {
      emitFilterFromState(
        applySelectAllChecked(distinctValues, filteredData, checked)
      );
    },
    [filteredData, distinctValues, emitFilterFromState]
  );

  const selectAllCheckedState = React.useMemo(
    () => computeSelectAllCheckedState(selectedValues, filteredData),
    [selectedValues, filteredData]
  );

  const openMenu = useRefCallback(() => {
    if (!isMenuOpen) setIsMenuOpen(true);
  }, [isMenuOpen]);

  const closeMenu = useRefCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return {
    searchText,
    setSearchText,
    caseSensitive,
    setCaseSensitive,
    isMenuOpen,
    openMenu,
    closeMenu,
    filteredData,
    selectAllCheckedState,
    onCheckedStatusChange,
    selectAll,
  };
}
