/**
 * Coordinate geometry for tapping the Skia canvas. The grid draws to a single
 * canvas (no per-cell native views), so Detox interacts by tapping points
 * relative to the `grid-root` element. tapAtPoint coordinates are element-local
 * (origin = grid-root top-left), so we compute them from the known column
 * widths + row/header heights of each story's deterministic config.
 *
 * These constants are calibrated against the default grid metrics; if a story
 * overrides headerHeight/rowHeight or shows the grouping bar, pass the offset.
 */
export const HEADER_H = 28; // HEADER_ROW_HEIGHT_DEFAULT
export const ROW_H = 30; // ROW_HEIGHT_DEFAULT
export const GROUP_BAR_H = 38; // grouping pill bar height when shown

type StoryCols = { ids: string[]; widths: number[] };

// Visible column layout per story (order + width) at horizontal scroll 0.
// Mirrors the column sets in seededData.ts. The selection story's checkbox
// column is forced to width 30 by the grid.
export const STORY_COLS: Record<string, StoryCols> = {
  basic: { ids: ["symbol", "quantity", "price", "side", "status"], widths: [100, 80, 100, 80, 120] },
  sorting: { ids: ["symbol", "quantity", "price", "side", "status"], widths: [100, 80, 100, 80, 120] },
  pinning: { ids: ["symbol", "quantity", "price", "side", "status"], widths: [100, 80, 100, 80, 120] },
  filtering: { ids: ["symbol", "trader", "quantity", "side", "updatedAt"], widths: [100, 100, 80, 80, 120] },
  grouping: { ids: ["side", "status", "symbol", "quantity", "price"], widths: [90, 110, 90, 90, 90] },
  selection: { ids: ["__sel", "symbol", "quantity", "price", "side", "status"], widths: [30, 100, 80, 100, 80, 120] },
  cellEditing: { ids: ["symbol", "quantity", "price", "status"], widths: [100, 90, 90, 120] },
  imperativeApi: { ids: ["symbol", "quantity", "price", "side", "status"], widths: [100, 80, 100, 80, 120] },
  slots: { ids: ["symbol", "quantity", "price", "side", "status"], widths: [100, 80, 100, 80, 120] },
  themingDensity: { ids: ["symbol", "quantity", "price", "side", "status"], widths: [100, 80, 100, 80, 120] },
};

/** Center x (element-local) of a column's header/cells at scroll 0. */
export function colCenterX(story: string, colId: string): number {
  const cfg = STORY_COLS[story];
  if (!cfg) throw new Error(`No column geometry for story "${story}"`);
  const idx = cfg.ids.indexOf(colId);
  if (idx < 0) throw new Error(`Column "${colId}" not in story "${story}"`);
  let x = 0;
  for (let i = 0; i < idx; i++) x += cfg.widths[i];
  return x + cfg.widths[idx] / 2;
}

/** Center y of the header row (optionally below the grouping bar). */
export function headerCenterY(opts: { groupBar?: boolean } = {}): number {
  return (opts.groupBar ? GROUP_BAR_H : 0) + HEADER_H / 2;
}

/** Center y of data row `rowIndex` (optionally below the grouping bar). */
export function rowCenterY(rowIndex: number, opts: { groupBar?: boolean } = {}): number {
  return (opts.groupBar ? GROUP_BAR_H : 0) + HEADER_H + rowIndex * ROW_H + ROW_H / 2;
}
