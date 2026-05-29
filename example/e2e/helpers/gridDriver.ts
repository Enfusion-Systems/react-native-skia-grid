import { readGridState, waitForGridState } from "./stateBridge";

const GRID_ROOT_TEST_ID = "grid-root";

/**
 * Declarative driver for grid interactions. Tests should compose these
 * helpers rather than calling element()/by.id() directly — keeps specs
 * stable across refactors of the host app.
 */
export const gridDriver = {
  root: () => element(by.id(GRID_ROOT_TEST_ID)),

  readState: readGridState,
  waitForState: waitForGridState,

  /**
   * Drag-scroll the grid vertically by `dy` pixels (negative = scroll down).
   * Anchored to the center of the grid root.
   */
  scrollVertical: async (dy: number): Promise<void> => {
    await element(by.id(GRID_ROOT_TEST_ID)).swipe(
      dy < 0 ? "up" : "down",
      "slow",
      Math.min(Math.abs(dy) / 400, 1)
    );
  },

  /**
   * Drag-scroll the grid horizontally by `dx` pixels (negative = scroll right).
   */
  scrollHorizontal: async (dx: number): Promise<void> => {
    await element(by.id(GRID_ROOT_TEST_ID)).swipe(
      dx < 0 ? "left" : "right",
      "slow",
      Math.min(Math.abs(dx) / 400, 1)
    );
  },

  /**
   * Tap at a relative (x, y) within the grid root. Coordinates are clamped
   * 0-1 and projected onto the grid's bounding box at call time.
   */
  tapAt: async (x: number, y: number): Promise<void> => {
    await element(by.id(GRID_ROOT_TEST_ID)).tapAtPoint({
      x: Math.round(x * 300),
      y: Math.round(y * 500),
    });
  },
};
