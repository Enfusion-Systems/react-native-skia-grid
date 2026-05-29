import type { RowNode, SkiaInternalGridColumn } from "../types";

// Pure autosize algorithm. Text measurement (getTextWidth, font handling) is
// renderer territory, so the caller provides `measure` and `cellText` as
// dependencies. Keeps this file free of any Skia / font-manager imports.

export type AutosizeMeasureText = (text: string) => number;

export type AutosizeInput<T extends Object> = {
  rows: RowNode<T>[];
  columns: SkiaInternalGridColumn<T>[];
  measure: AutosizeMeasureText;
  cellText: (row: RowNode<T>, column: SkiaInternalGridColumn<T>) => string;
  headerText?: (column: SkiaInternalGridColumn<T>) => string;
  // Restrict the pass to these columns; undefined = all columns.
  targetColumnIds?: string[];
  minWidth?: number;
  maxWidth?: number;
  // Horizontal padding (left + right combined) added to the measured text.
  padding?: number;
};

export function autosizeColumns<T extends Object>(
  input: AutosizeInput<T>
): Record<string, number> {
  const {
    rows,
    columns,
    measure,
    cellText,
    headerText = defaultHeaderText,
    targetColumnIds,
    minWidth = 50,
    maxWidth = 500,
    padding = 16,
  } = input;

  const targetIds = targetColumnIds ? new Set(targetColumnIds) : null;
  const result: Record<string, number> = {};

  for (const column of columns) {
    if (targetIds && !targetIds.has(column.__id)) continue;

    let widest = measure(headerText(column));
    for (const row of rows) {
      const width = measure(cellText(row, column));
      if (width > widest) widest = width;
    }

    result[column.__id] = Math.max(
      minWidth,
      Math.min(maxWidth, widest + padding)
    );
  }

  return result;
}

function defaultHeaderText<T extends Object>(
  column: SkiaInternalGridColumn<T>
): string {
  return column.name ?? column.field ?? "";
}
