import {
  colCenterX,
  headerCenterY,
  rowCenterY,
} from "./columnGeometry";
import { readGridState, waitForGridState } from "./stateBridge";

const GRID_ROOT_TEST_ID = "grid-root";

type TapOpts = { groupBar?: boolean };

/**
 * Declarative driver for grid interactions. Specs compose these helpers rather
 * than calling element()/by.id() directly so they stay tolerant to host-app
 * refactors. Canvas taps are element-local points on `grid-root` (see
 * columnGeometry); modal/menu controls are matched by their visible text.
 */
export const gridDriver = {
  root: () => element(by.id(GRID_ROOT_TEST_ID)),
  readState: readGridState,
  waitForState: waitForGridState,

  /** Raw element-local tap on the grid canvas. */
  tapPoint: async (x: number, y: number): Promise<void> => {
    await element(by.id(GRID_ROOT_TEST_ID)).tapAtPoint({
      x: Math.round(x),
      y: Math.round(y),
    });
  },

  /** Tap a column header (opens the column action sheet). */
  tapHeader: async (
    story: string,
    colId: string,
    opts: TapOpts = {}
  ): Promise<void> => {
    await element(by.id(GRID_ROOT_TEST_ID)).tapAtPoint({
      x: Math.round(colCenterX(story, colId)),
      y: Math.round(headerCenterY(opts)),
    });
  },

  /** Alias that reads better in specs. */
  openColumnMenu: async (
    story: string,
    colId: string,
    opts: TapOpts = {}
  ): Promise<void> => {
    await gridDriver.tapHeader(story, colId, opts);
  },

  /** Tap a data cell at (rowIndex, colId). */
  tapCell: async (
    story: string,
    rowIndex: number,
    colId: string,
    opts: TapOpts = {}
  ): Promise<void> => {
    await element(by.id(GRID_ROOT_TEST_ID)).tapAtPoint({
      x: Math.round(colCenterX(story, colId)),
      y: Math.round(rowCenterY(rowIndex, opts)),
    });
  },

  /** Tap a control/menu item by its visible text (e.g. "Filter", "Pin Column"). */
  tapText: async (text: string): Promise<void> => {
    await element(by.text(text)).tap();
  },

  /**
   * Tap a control by accessibilityLabel. Use for icon-only action buttons
   * ("Asc"/"Desc"/"Clear Sorting") whose label is exposed via accessibilityLabel
   * rather than visible text.
   */
  tapLabel: async (label: string): Promise<void> => {
    await element(by.label(label)).tap();
  },

  /** Tap an element by testID (action-menu buttons, DataSizeControls, toggles). */
  tapId: async (id: string): Promise<void> => {
    await element(by.id(id)).tap();
  },

  /** Long-press an element by testID (e.g. multi-sort add via Asc/Desc). */
  longPressId: async (id: string, durationMs = 1200): Promise<void> => {
    await element(by.id(id)).longPress(durationMs);
  },

  /**
   * Column action-sheet buttons by stable testID. Tap a header first to open
   * the sheet (openColumnMenu).
   */
  action: {
    sortAsc: "grid-action-sort-asc",
    sortDesc: "grid-action-sort-desc",
    sortClear: "grid-action-sort-clear",
    filter: "grid-action-filter",
    filterClear: "grid-action-filter-clear",
    autosize: "grid-action-autosize",
    pin: "grid-action-pin",
    group: "grid-action-group",
  } as const,

  // Anchor swipes to the element centre (normalized start 0.5,0.5) so the
  // gesture origin is always within the visible canvas region.
  scrollVertical: async (dir: "up" | "down", frac = 0.5): Promise<void> => {
    await element(by.id(GRID_ROOT_TEST_ID)).swipe(dir, "slow", frac, 0.5, 0.5);
  },

  scrollHorizontal: async (dir: "left" | "right", frac = 0.5): Promise<void> => {
    await element(by.id(GRID_ROOT_TEST_ID)).swipe(dir, "slow", frac, 0.5, 0.5);
  },
};
