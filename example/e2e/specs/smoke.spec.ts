import { expect as jestExpect } from "@jest/globals";
import { gridDriver } from "../helpers/gridDriver";

// Detox v20 hijacks the global `expect` for its element matchers, so all
// value-based assertions must use jestExpect from @jest/globals.

describe("Skia Grid - smoke", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("should mount the grid and report state within 5s", async () => {
    const state = await gridDriver.waitForState((s) => s.rowCount > 0, {
      description: "grid mount + first onLayoutComplete",
    });
    jestExpect(state.rowCount).toBe(100);
    jestExpect(state.columnIds.length).toBeGreaterThan(0);
  });

  it("should expose the expected column ids on the basic scene", async () => {
    const state = await gridDriver.waitForState((s) => s.columnIds.length > 0);
    jestExpect(state.columnIds).toEqual([
      "symbol",
      "quantity",
      "price",
      "side",
      "status",
    ]);
  });

  it("should report empty selection at mount", async () => {
    const state = await gridDriver.waitForState((s) => s.rowCount > 0);
    jestExpect(state.selectedRowIds).toEqual([]);
    jestExpect(state.editingCell).toBeNull();
    jestExpect(state.filterColumnIds).toEqual([]);
  });
});
