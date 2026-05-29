import type { SkiaInternalGridColumn } from "../core/types";
import { PinnedStatuses } from "../core/types";

export type ColumnSectionLayout<T extends Object> = {
  sections: {
    left: SkiaInternalGridColumn<T>[];
    center: SkiaInternalGridColumn<T>[];
    right: SkiaInternalGridColumn<T>[];
  };
  totalWidths: {
    left: number;
    center: number;
    right: number;
    full: number;
  };
  individualWidths: {
    left: number[];
    center: number[];
    right: number[];
  };
};

/**
 * Partition columns by pinned status into left / center / right sections.
 * Aggregates section totals and extracts individual per-column widths.
 *
 * Pure O(n) single-pass reduce. Hidden columns (`hide === true`) are excluded
 * from all sections and totals.
 *
 * Complements existing width utilities in gridUtils.ts:
 * - calculatePinnedWidth (section width clamping)
 * - calculateSectionWidth (resize math)
 * - deriveIndexes (viewport culling on cumulative widths)
 */
export function partitionColumnsBySection<T extends Object>(
  columns: SkiaInternalGridColumn<T>[]
): ColumnSectionLayout<T> {
  const left: SkiaInternalGridColumn<T>[] = [];
  const center: SkiaInternalGridColumn<T>[] = [];
  const right: SkiaInternalGridColumn<T>[] = [];
  const leftWidths: number[] = [];
  const centerWidths: number[] = [];
  const rightWidths: number[] = [];
  const totals = { left: 0, center: 0, right: 0, full: 0 };

  for (const column of columns) {
    if (column.hide) continue;

    totals.full += column.width;

    if (column.pinned === PinnedStatuses.LEFT) {
      totals.left += column.width;
      left.push(column);
      leftWidths.push(column.width);
    } else if (column.pinned === PinnedStatuses.RIGHT) {
      totals.right += column.width;
      right.push(column);
      rightWidths.push(column.width);
    } else {
      totals.center += column.width;
      center.push(column);
      centerWidths.push(column.width);
    }
  }

  return {
    sections: { left, center, right },
    totalWidths: totals,
    individualWidths: {
      left: leftWidths,
      center: centerWidths,
      right: rightWidths,
    },
  };
}
