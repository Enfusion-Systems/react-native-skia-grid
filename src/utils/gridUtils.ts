import type { SelectOptionsType } from "../internal/types";
import type { GridTheme } from "../themes";
import { memoize } from "../internal/utils";
import type { ICache, ICacheKey } from "../internal/utils";
import { faCheck, faDash } from "@fortawesome/pro-solid-svg-icons";
import {
  type SkCanvas,
  type SkFont,
  type SkTypefaceFontProvider,
  Skia,
} from "@shopify/react-native-skia";
import { get, startCase } from "lodash";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";

import {
  type DrawingContext,
  type GridContentIndexes,
  type GridIcons,
  type RowDataTransaction,
  type RowNode,
  type SkiaGridColumn,
  type SkiaInternalGridColumn,
} from "../core/types";
import { GROUP_KEY_SEPARATOR } from "./constants";
import { translationClamp } from "../renderer/sectionWidthUtils";
import { getTextWidth } from "../renderer/drawing/fontUtils";

export const randomValue = (from: number, to: number) =>
  Math.min(Math.round(from + Math.random() * (to - from)), to);

export const DEFAULT_SECTION_SEPARATION = { left: 1, right: 1 };

export const DEFAULT_ICONS: GridIcons = {
  selected: [faCheck.icon[0], faCheck.icon[1], faCheck.icon[4] as string],
  partiallySelected: [faDash.icon[0], faDash.icon[1], faDash.icon[4] as string],
};

export function getFilterKey<T extends Object>(
  column: SkiaInternalGridColumn<T>
) {
  return typeof column.filterKey === "function"
    ? column.filterKey()
    : column.filterKey ?? column.colId ?? column.field ?? column.__index;
}

type StartEnd = { start: number; end: number };

/**
 * Count-bounded LRU cache. Unlike the TTL-based `BasicLRUCache` from
 * `internal/utils`, this evicts the least-recently-used entry when `set()`
 * pushes size above `max`. It also skips the O(n) `forEach` sweep on
 * `has()` that the TTL variant does to expire stale entries — which, under
 * heavy scrolling, made each `deriveIndexes` call progressively slower as
 * the cache accumulated scroll-position keys (up to ~3,600 entries during
 * 60 seconds of 60 fps scroll, all scanned on every `has()`).
 *
 * Map's insertion order is used as usage order: delete + re-insert on
 * `get()` moves the entry to the MRU end; oldest entry is the first
 * `keys().next().value` on overflow.
 */
class BoundedLRUCache<T> implements ICache<T> {
  private store = new Map<string, T>();
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  private keyOf(key: ICacheKey): string {
    return Array.isArray(key) ? key[0] : key;
  }

  public has = (key: ICacheKey): boolean => this.store.has(this.keyOf(key));

  public get = (key: ICacheKey): T | undefined => {
    const k = this.keyOf(key);
    const value = this.store.get(k);
    if (value === undefined) return undefined;
    this.store.delete(k);
    this.store.set(k, value);
    return value;
  };

  public set = (key: ICacheKey, value: T): void => {
    const k = this.keyOf(key);
    if (this.store.has(k)) this.store.delete(k);
    this.store.set(k, value);
    if (this.store.size > this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  };

  public delete = (key: ICacheKey): boolean =>
    this.store.delete(this.keyOf(key));

  public clear = (): void => {
    this.store.clear();
  };
}

// 512 covers ~8 s of 60 fps continuous scroll plus headroom for scroll
// reversals (common hit pattern). Memory footprint is negligible — each
// entry is a small `{ cols, rows }` object.
const INDEXES_CACHE_MAX = 512;
const indexesCache = new BoundedLRUCache<{ cols: StartEnd; rows: StartEnd }>(
  INDEXES_CACHE_MAX
);

export const deriveIndexes = memoize(
  (
    columns: number[],
    rowHeight: number,
    xVal: number,
    yVal: number,
    wVal: number,
    hVal: number,
    fullHeight: number,
    fullWidth: number,
    rowsLength: number
  ) => {
    const translateY = translationClamp(yVal, hVal - fullHeight);
    const translateX = translationClamp(xVal, wVal - fullWidth);

    const colsRes = { start: 0, end: 0 };

    let colDiff = 0;
    let startFound = false;
    for (let i = 0; i < columns.length; i += 1) {
      const change = colDiff + columns[i] + translateX;
      if (!startFound && change > 0) {
        colsRes.start = i;
        startFound = true;
      }
      colDiff += columns[i];
      if (change >= wVal) {
        colsRes.end = i;
        break;
      }
    }
    if (colDiff < wVal) {
      colsRes.end = Math.max(columns.length - 1, 0);
    }

    const firstRowIndex = Math.floor(Math.abs(translateY) / rowHeight);
    const rowDiff = Math.ceil(hVal / rowHeight);
    const rowsRes = {
      start: firstRowIndex,
      end: Math.min(firstRowIndex + rowDiff, rowsLength - 1),
    };

    return { cols: colsRes, rows: rowsRes };
  },
  (
    columns: number[],
    rowHeight: number,
    xVal: number,
    yVal: number,
    wVal: number,
    hVal: number,
    fullHeight: number,
    fullWidth: number
  ) =>
    `${JSON.stringify(columns)}-${[
      rowHeight,
      xVal,
      yVal,
      wVal,
      hVal,
      fullHeight,
      fullWidth,
    ].join("-")}`,
  indexesCache
);

export const calculateBufferIndexes = <T extends Object>(
  indexes: GridContentIndexes,
  columns: SkiaInternalGridColumn<T>[],
  columnBuffer: number,
  rowBuffer: number,
  rowsLength: number
) => {
  const columnsStartIndex =
    indexes.cols.start < columnBuffer ? 0 : indexes.cols.start - columnBuffer;
  const columnsEndIndex =
    indexes.cols.end + columnBuffer < columns.length
      ? indexes.cols.end + columnBuffer
      : columns.length - 1;

  const rowsStartIndex =
    indexes.rows.start - rowBuffer < 0 ? 0 : indexes.rows.start - rowBuffer;
  const rowsEndIndex =
    indexes.rows.end + rowBuffer <= rowsLength
      ? indexes.rows.end + rowBuffer
      : rowsLength;

  return {
    cols: { start: columnsStartIndex, end: columnsEndIndex },
    rows: { start: rowsStartIndex, end: rowsEndIndex },
  } as GridContentIndexes;
};

export const checkIndexes = (
  indexes: GridContentIndexes,
  currentIndexes: GridContentIndexes
) => {
  return (
    indexes.cols.start < currentIndexes.cols.start ||
    indexes.cols.end > currentIndexes.cols.end ||
    indexes.rows.start < currentIndexes.rows.start ||
    indexes.rows.end > currentIndexes.rows.end
  );
};

/**
 * Combines a list of refs into a single ref. This can be used to provide
 * both a forwarded ref and an internal ref keeping the same functionality
 * on both of the refs.
 * @param refs Array of refs to combine
 * @returns A single ref that can be used in a ref prop.
 */
export const useCombinedRefs = <T>(
  ...refs: Array<React.MutableRefObject<T> | React.ForwardedRef<T>>
) => {
  const targetRef = React.useRef<T>(null);
  React.useEffect(() => {
    refs.forEach((ref) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(targetRef.current);
        } else {
          ref.current = targetRef.current;
        }
      }
    });
  }, [refs]);
  return targetRef;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformDataToRowNode<T extends Object>(
  data: T[],
  getRowId?: (rowData: T) => string
) {
  return data.map(
    (i, idx) =>
      ({
        id: getRowId?.(i) ?? uuidv4(),
        __index: idx,
        __id: getRowId?.(i) ?? uuidv4(),
        data: i,
        group: false,
        level: 0,
        children: [],
      } as RowNode<T>)
  );
}

export function calculateRowColumnWidths<T extends Object>(
  node: RowNode<T>,
  columnDefs?: SkiaInternalGridColumn<T>[],
  font?: SkFont
) {
  const res: Record<string, number> = {};
  if (columnDefs) {
    for (const def of columnDefs) {
      if ((!def.hide && !def.checkboxSelection) || def.rowGroup) {
        // getTextWidth already applies FONT_WIDTH_ADJ_MULTIPLIER and caches the
        // measurement; max(h·M, t·M) === max(h, t)·M, so this is numerically
        // identical to the previous raw measureText path — just cached.
        const headerWidth = font ? getTextWidth(font, def.name) : 0;
        const textWidth = font
          ? getTextWidth(
              font,
              def?.rowGroup
                ? get(node.groupRowData, def.field) ?? ""
                : getDisplayValue(def, node)[0]?.toString() ?? ""
            )
          : 0;
        res[def.__id] = Math.max(headerWidth, textWidth);
      }
    }
  }
  return res;
}

export function applyGridTransaction<T extends Object>(
  transaction: RowDataTransaction<T> | RowDataTransaction<T>[],
  rowsData: Array<RowNode<T>>,
  setRowData: (
    newRows: Array<RowNode<T>>,
    add: RowNode<T>[],
    update: RowNode<T>[],
    remove: RowNode<T>[]
  ) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRowId?: (rowData: T) => string,
  columnsDefs?: Array<SkiaInternalGridColumn<T>>,
  font?: SkFont,
  updateColumnWidthCache?: (
    updateWidths: Record<string, number>[],
    removeWidths: Record<string, number>[]
  ) => void
) {
  const transactions = Array.isArray(transaction) ? transaction : [transaction];

  const allWidths: Array<Record<string, number>> = [];
  const removeWidths: Array<Record<string, number>> = [];

  const {
    add,
    update,
    remove,
    rows: newRows,
  } = transactions.reduce<{
    add: Array<RowNode<T>>;
    rows: Array<RowNode<T>>;
    update: Array<RowNode<T>>;
    remove: Array<RowNode<T>>;
  }>(
    (res, t) => {
      if (t.add) {
        const [newRows, updateRows] = transformDataToRowNode(
          t.add,
          getRowId
        ).reduce(
          (acc, r) => {
            if (!res.rows.some((r2) => r2.id === r.id)) {
              acc[0].push(r);
              allWidths.push(calculateRowColumnWidths(r, columnsDefs, font));
            } else {
              acc[1].push(r);
            }
            return acc;
          },
          [[], []] as [Array<RowNode<T>>, Array<RowNode<T>>]
        );
        res.add = [...res.add, ...newRows];
        const index = Math.min(Math.max(t.addIndex ?? 0, 0), res.rows.length);
        if (index === 0) {
          res.rows = [...newRows, ...res.rows];
        } else {
          res.rows = [
            ...res.rows.slice(0 - index),
            ...newRows,
            ...res.rows.slice(index),
          ];
        }

        if (updateRows.length > 0) {
          res.update = updateRows.reduce<RowNode<T>[]>(
            (innerRes, entry) => {
              if (typeof entry.id === "undefined") {
                return innerRes;
              }
              allWidths.push(
                calculateRowColumnWidths(entry, columnsDefs, font)
              );
              const rowIdx = res.rows.findIndex((r) => r.__id === entry.id);
              const newEntry = { ...res.rows[rowIdx], data: entry.data };
              res.rows[rowIdx] = { ...newEntry };
              return [...innerRes, newEntry];
            },
            [...res.update]
          );
        }
      }
      if (t.update) {
        res.update = t.update.reduce<RowNode<T>[]>(
          (innerRes, entry) => {
            const id = getRowId?.(entry);
            if (typeof id === "undefined") return innerRes;

            allWidths.push(
              calculateRowColumnWidths(
                { data: entry } as RowNode<T>,
                columnsDefs,
                font
              )
            );
            const rowIdx = res.rows.findIndex((r) => r.__id === id);
            const newEntry = { ...res.rows[rowIdx], data: entry };
            res.rows[rowIdx] = { ...newEntry };
            return [...innerRes, newEntry];
          },
          [...res.update]
        );
      }
      if (t.remove) {
        res.remove = t.remove.reduce<RowNode<T>[]>(
          (innerRes, entry) => {
            const id = getRowId?.(entry);
            if (typeof id === "undefined") return innerRes;

            removeWidths.push(
              calculateRowColumnWidths(
                { data: entry } as RowNode<T>,
                columnsDefs,
                font
              )
            );
            const rowIdx = res.rows.findIndex((r) => r.__id === id);
            if (rowIdx > -1) {
              const newEntry = { ...res.rows[rowIdx] };
              res.rows.splice(rowIdx, 1);
              return [...innerRes, newEntry];
            }

            return innerRes;
          },
          [...res.remove]
        );
      }
      return res;
    },
    {
      add: [],
      rows: [...rowsData],
      update: [],
      remove: [],
    }
  );

  if (add.length > 0 || update.length > 0 || remove.length > 0) {
    setRowData(
      newRows.map((i, idx) => ({
        ...i,
        __index: idx,
      })),
      add,
      update,
      remove
    );
    updateColumnWidthCache?.(allWidths, removeWidths);
  }
}

export function getDrawingCtx(
  canvas: SkCanvas,
  width: number,
  height: number,
  fontManager: SkTypefaceFontProvider | null,
  theme: GridTheme
): DrawingContext {
  return {
    canvas,
    width,
    height,
    theme,
    fontManager:
      fontManager ?? (Skia.FontMgr.System() as SkTypefaceFontProvider),
    paint: Skia.Paint(),
  };
}

export const getDisplayValue = memoize(
  function getDisplayValueCore<T extends Object>(
    column: SkiaGridColumn<T>,
    row: RowNode<T>
  ) {
    const value = column.valueGetter
      ? column.valueGetter?.(row)
      : get(row.data, column.field);

    return [
      column.valueFormatter?.({
        row,
        value,
        column,
      }) ??
        value ??
        "",
      value ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any[];
  },
  (column, row) => {
    const value = column.valueGetter
      ? column.valueGetter(row)
      : get(row.data, column.field);

    return `${column.id || column.colId}-${column.field}-${JSON.stringify(
      value
    )}`;
  }
);

export const isTopRowEmpty = <T extends Object>(
  topRowNode: RowNode<T> | null
): boolean => {
  if (!(topRowNode && topRowNode.data)) return true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !Object.values(topRowNode.data)?.some((e) => e && e.value);
};

export function getColumnAtX<T extends Object>(
  cols: SkiaInternalGridColumn<T>[],
  xPos: number
) {
  let xLeftOver = xPos;
  let colIdx = 0;
  for (let i = 0; i < cols.length; i++) {
    xLeftOver -= cols[i].width;
    if (xLeftOver <= 0) {
      break;
    }
    colIdx += 1;
  }
  const idx = Math.min(colIdx, cols.length - 1);
  if (idx < 0 || idx >= cols.length) {
    return undefined;
  }
  return cols[idx];
}

export function getParentRowNodeKeys<T extends Object>(
  row: RowNode<T>,
  cols: SkiaInternalGridColumn<T>[]
) {
  const values = cols.map((col) => {
    const [columnValue] = getDisplayValue(col, row);
    return columnValue?.toString().length ? columnValue.toString() : "__Blank__";
  });

  return values.reduce<string[]>((res, value) => {
    if (res.length) {
      res.push(`${res[res.length - 1]}${GROUP_KEY_SEPARATOR}${value}`);
    } else {
      res.push(value);
    }
    return res;
  }, []);
}

export const getColumnValue = <T extends Object>(
  row: RowNode<T>,
  column: SkiaInternalGridColumn<T>
) => {
  let res = column.valueGetter
    ? column.valueGetter?.(row)
    : get(row.data, column.field);

  return res === "NaN" ? null : res;
};

export function createOptions<T = string>(values: string[]) {
  return values.map((i) => ({
    value: i as unknown as T,
    label: startCase(i),
  })) as SelectOptionsType<T>[];
}

export const getParentKeys = (key: string) => {
  let parentKeys: string[] = [];
  const split = key.split(GROUP_KEY_SEPARATOR).slice(0, -1);

  if (split.length > 1) {
    const keys = getParentKeys(split.join(GROUP_KEY_SEPARATOR));
    parentKeys = [...keys, split.join(GROUP_KEY_SEPARATOR)];
  } else if (split.length === 1) {
    parentKeys.push(split[0]);
  }
  return parentKeys;
};

export function getEmptyPicture(dimensions: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const { x, y, width, height } = dimensions;
  const rec = Skia.PictureRecorder();
  rec.beginRecording(Skia.XYWHRect(x, y, width, height));
  return rec.finishRecordingAsPicture();
}

// ─── Re-exports from focused sibling files ──────────────────────────────────
// These functions have been moved to focused modules for maintainability.
// gridUtils.ts acts as a barrel so existing imports continue to resolve.
export {
  getFolderCalculatedCheckedState,
  getIsRowSelected,
  getSelectedRows,
  updateLeafNodeSelectionState,
} from "./selectionUtils";
export {
  buildColGroupDepthMap,
  buildColumnGroupPaths,
  columnDefsContentEqual,
  computeColumnGroupHeaders,
  flattenColumnDefs,
  isColGroupDef,
  mapToInternalColumns,
  mergeColumnDefsWithState,
} from "./columnGroupUtils";
