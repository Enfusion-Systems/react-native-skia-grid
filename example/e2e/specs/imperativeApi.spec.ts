import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Exercises the imperative SkiaGridAPI via the story's on-screen buttons.
describe("Imperative API", () => {
  beforeAll(async () => {
    await launchStory("imperativeApi");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("clears and resets rows (clearRows / setRowsData)", async () => {
    await gridDriver.tapId("api-clear");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 0)).rowCount).toBe(0);

    await gridDriver.tapId("api-reset");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 100)).rowCount).toBe(100);
  });

  it("adds a row (applyTransaction add)", async () => {
    await gridDriver.tapId("api-add");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 101)).rowCount).toBe(101);
  });

  it("deselects all (deselectAll)", async () => {
    await gridDriver.tapCell("imperativeApi", 0, "symbol");
    await gridDriver.waitForState((s) => s.selectedRowIds.length === 1);

    await gridDriver.tapId("api-deselect");
    const state = await gridDriver.waitForState((s) => s.selectedRowIds.length === 0);
    jestExpect(state.selectedRowIds).toEqual([]);
  });
});
