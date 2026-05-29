import { updateFilterAtIndex } from "../../../../core/filter";
import type {
  CombinedFilterModel,
  SetFilterType,
  SkiaInternalGridColumn,
} from "../../../../core/types";
import { useRefCallback } from "../../../../internal/hooks";
import type { GridContextSnapshot } from "../../../context";

export function useHandleFilterChange(
  filterKey: string,
  column: SkiaInternalGridColumn | null | undefined,
  useGridActions: () => GridContextSnapshot
) {
  const { selectedColumn, filterState, setFilterState, columns } =
    useGridActions();

  return useRefCallback(
    (index: number, filter: CombinedFilterModel | SetFilterType | null) => {
      if (column && filterKey) {
        setFilterState(
          updateFilterAtIndex(filterState, filterKey, column, index, filter)
        );
      }
    },
    [columns, filterState, setFilterState, selectedColumn, filterKey, column]
  );
}
