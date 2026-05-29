import type { SetFilterType } from "../../../../core/types";
import type { SetItem } from "./types";

export function toSetItems(
  values: string[],
  selectedValues: SetFilterType["values"] | null | undefined
): SetItem[] {
  return values.map((val, idx) => ({
    key: idx,
    value: val,
    checked: selectedValues
      ? (selectedValues as (string | number | Date)[]).some((x) => x === val) ??
        false
      : true,
  }));
}

export function toggleDistinctValueAt(
  distinctValues: SetItem[],
  idx: number,
  checked: boolean
): SetItem[] {
  const next = [...distinctValues];
  next.splice(idx, 1, { ...distinctValues[idx], checked });
  return next;
}

export function applySelectAllChecked(
  distinctValues: SetItem[],
  filteredData: SetItem[],
  checked: boolean
): SetItem[] {
  const filteredValues = filteredData.map((item) => item.value);
  return distinctValues.map((item) => ({
    ...item,
    checked: filteredValues.includes(item.value) ? checked : item.checked,
  }));
}

export function filterDistinctValuesBySearch(
  distinctValues: SetItem[],
  searchText: string,
  caseSensitive: boolean
): SetItem[] {
  const trimmed = searchText.trim();
  return distinctValues.filter((item) =>
    caseSensitive
      ? `${item.value}`.includes(trimmed)
      : `${item.value}`.toLowerCase().includes(trimmed.toLowerCase())
  );
}

export function computeSelectAllCheckedState(
  selectedValues: SetFilterType["values"] | null | undefined,
  filteredData: SetItem[]
): boolean | null {
  if (selectedValues === null) return true;
  let state: boolean | null = null;
  for (const data of filteredData) {
    if (state === null) state = data.checked;
    if (state === data.checked) continue;
    state = null;
    break;
  }
  return state;
}
