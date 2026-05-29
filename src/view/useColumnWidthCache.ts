import type { SkFont } from "@shopify/react-native-skia";
import * as React from "react";

import type { RowNode, SkiaInternalGridColumn } from "../core/types";
import { useRefCallback } from "../internal/hooks";
import {
  CELL_PADDING,
  GROUP_COLUMN_ID,
  GROUP_COLUMN_NAME,
  GROUPED_ROW_PADDING,
} from "../utils/constants";
import { getTextWidth } from "../renderer/drawing/fontUtils";
import { calculateRowColumnWidths } from "../utils/gridUtils";

export type UseColumnWidthCacheDeps<T extends Object> = {
  columns: SkiaInternalGridColumn<T>[];
  font: SkFont;
  rowsDataRef: React.MutableRefObject<RowNode<T>[]>;
};

export type UseColumnWidthCacheResult<T extends Object> = {
  columnWidthMap: React.MutableRefObject<Map<string, number>>;
  resetColumnWidthCache: (rows: RowNode<T>[]) => Promise<void>;
  updateColumnWidthCache: (
    updateWidths: Record<string, number>[],
    removeWidths: Record<string, number>[]
  ) => void;
  recomputeGroupColumnWidth: (
    groupedColumns: SkiaInternalGridColumn<T>[]
  ) => void;
};

// Per-column max text-width cache, used to derive autosized widths without
// re-measuring every cell on each interaction. The cache is rebuilt in
// chunks so we can yield to the event loop between slices — see
// resetColumnWidthCache below for the rationale.
export function useColumnWidthCache<T extends Object>({
  columns,
  font,
  rowsDataRef,
}: UseColumnWidthCacheDeps<T>): UseColumnWidthCacheResult<T> {
  const columnWidthMap = React.useRef<Map<string, number>>(new Map());

  // Chunked rebuild of the column-width cache. The naive version ran
  // O(rows × columns) synchronous Skia `font.measureText` calls inside a
  // Promise constructor — for a 5000-row stress grid that's ~100k
  // measurements and blocks the JS thread for multiple seconds on mount
  // (and again on the first filter debounce). Chunking yields to the
  // event loop between slices so gestures, layouts, and picture records
  // can interleave. The total work is unchanged; wall-clock is similar
  // but the UI stays responsive.
  const resetColumnWidthCache = useRefCallback(
    (rows: RowNode<T>[]) => {
      const CHUNK_SIZE = 100;
      return new Promise<void>((resolve) => {
        columnWidthMap.current = new Map();
        let index = 0;

        const processChunk = () => {
          const end = Math.min(index + CHUNK_SIZE, rows.length);
          for (; index < end; index++) {
            const row = rows[index];
            const widths = calculateRowColumnWidths(row, columns, font);
            for (const col of columns) {
              const val = columnWidthMap.current.get(col.__id);
              if (
                typeof widths[col.__id] === "number" &&
                (typeof val !== "number" || val < widths[col.__id])
              ) {
                columnWidthMap.current.set(col.__id, widths[col.__id]);
              }
            }
          }
          if (index < rows.length) {
            setTimeout(processChunk, 0);
          } else {
            resolve();
          }
        };

        if (rows.length === 0) {
          resolve();
          return;
        }
        processChunk();
      });
    },
    [font, columns]
  );

  const updateColumnWidthCache = useRefCallback(
    (
      updateWidths: Record<string, number>[],
      removeWidths: Record<string, number>[]
    ) => {
      const recalculateColumnsWidth: SkiaInternalGridColumn<T>[] = [];

      for (const col of columns) {
        for (const widths of updateWidths) {
          const val = columnWidthMap.current.get(col.__id);
          if (
            typeof widths[col.__id] === "number" &&
            (typeof val !== "number" || val < widths[col.__id])
          ) {
            columnWidthMap.current.set(col.__id, widths[col.__id]);
          }
        }

        const val = columnWidthMap.current.get(col.__id);
        for (const widths of removeWidths) {
          if (
            typeof widths[col.__id] === "number" &&
            typeof val === "number" &&
            val <= widths[col.__id]
          ) {
            recalculateColumnsWidth.push(col);
          }
        }
      }
      if (recalculateColumnsWidth.length) {
        const newColWidthMap = rowsDataRef.current.reduce<
          Record<string, number>
        >((res, row) => {
          const colWidthMap = calculateRowColumnWidths(
            row,
            recalculateColumnsWidth,
            font
          );
          for (const col in colWidthMap) {
            if (!res[col]) {
              res[col] = colWidthMap[col];
            } else if (res[col] < colWidthMap[col]) {
              res[col] = colWidthMap[col];
            }
          }
          return res;
        }, {} as Record<string, number>);
        for (const col in newColWidthMap) {
          columnWidthMap.current.set(col, newColWidthMap[col]);
        }
      }
    },
    [columns, rowsDataRef, columnWidthMap.current]
  );

  // Recomputes the synthetic group column's cached width from the current
  // grouped columns. Lives here (not in core) because it depends on Skia
  // font measurement and on the column-width cache this hook owns.
  const recomputeGroupColumnWidth = useRefCallback(
    (groupedColumns: SkiaInternalGridColumn<T>[]) => {
      if (!groupedColumns.length) {
        columnWidthMap.current.delete(GROUP_COLUMN_ID);
        return;
      }
      const headerWidth = getTextWidth(font, GROUP_COLUMN_NAME);
      const groupColWidth = groupedColumns.reduce<number>((res, col) => {
        const cachedColWidth = columnWidthMap.current.get(col.__id) ?? 0;
        const xPos = ((col.rowGroupIndex ?? 0) + 1) * GROUPED_ROW_PADDING;
        const newWidth = 4 * CELL_PADDING + cachedColWidth + xPos;
        return res < newWidth ? newWidth : res;
      }, headerWidth);
      columnWidthMap.current.set(GROUP_COLUMN_ID, groupColWidth);
    },
    [font]
  );

  return {
    columnWidthMap,
    resetColumnWidthCache,
    updateColumnWidthCache,
    recomputeGroupColumnWidth,
  };
}
