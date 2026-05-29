import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Mount / initial-state smoke checks against the basic story. The app boots to
// the Stories list, so we deep-link straight into "basic".
describe("Skia Grid - smoke", () => {
  beforeAll(async () => {
    await launchStory("basic");
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

  it("should expose the expected column ids on the basic story", async () => {
    const state = await gridDriver.waitForState((s) => s.columnIds.length > 0);
    jestExpect(state.columnIds).toEqual([
      "symbol",
      "quantity",
      "price",
      "side",
      "status",
    ]);
  });

  it("should report empty selection / edit / filter at mount", async () => {
    const state = await gridDriver.waitForState((s) => s.rowCount > 0);
    jestExpect(state.selectedRowIds).toEqual([]);
    jestExpect(state.editingCell).toBeNull();
    jestExpect(state.filterColumnIds).toEqual([]);
  });
});
