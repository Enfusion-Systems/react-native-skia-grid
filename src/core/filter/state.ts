import type {
  ColumnFilterState,
  CombinedFilterModel,
  MultiFilterParams,
  SetFilterType,
  SkiaInternalGridColumn,
} from "../types";

export function buildColumnFilterArray<T extends Object>(
  column: SkiaInternalGridColumn<T>,
  index: number,
  filter: CombinedFilterModel | SetFilterType | null
): Array<CombinedFilterModel | SetFilterType | null> {
  if (column.filterType === "multi") {
    const total =
      (column.filterParams as MultiFilterParams).filters?.length ?? 2;
    return new Array<CombinedFilterModel | SetFilterType | null>(total)
      .fill(null)
      .map((slot, idx) => (idx === index ? filter : slot));
  }
  return [filter];
}

export function isColumnFilterStateEmpty(
  columnFilterState: ColumnFilterState | undefined
): boolean {
  if (!columnFilterState) return true;
  return (
    !(columnFilterState.filters[0] as CombinedFilterModel)?.conditions
      ?.length &&
    !(columnFilterState.filters[1] as SetFilterType)?.values &&
    !(columnFilterState.filters[0] as SetFilterType)?.values
  );
}

export function updateFilterAtIndex<T extends Object>(
  filterState: Map<string, ColumnFilterState>,
  filterKey: string,
  column: SkiaInternalGridColumn<T>,
  index: number,
  filter: CombinedFilterModel | SetFilterType | null
): Map<string, ColumnFilterState> {
  const newFilterState = new Map(filterState);
  const existing = newFilterState.get(filterKey);

  if (existing) {
    existing.filters[index] = filter;
    newFilterState.set(filterKey, existing);
  } else {
    const newColFilterState: ColumnFilterState = {
      id: filterKey,
      filterIndex: newFilterState.size,
      filterType: column.filterType,
      filters: buildColumnFilterArray(column, index, filter),
    };
    newFilterState.set(filterKey, newColFilterState);
  }

  if (isColumnFilterStateEmpty(newFilterState.get(filterKey))) {
    newFilterState.delete(filterKey);
  }

  return newFilterState;
}
