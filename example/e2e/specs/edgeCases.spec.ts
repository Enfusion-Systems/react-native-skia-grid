import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Boundary datasets via the emptyAndEdge story (starts at 0 rows).
describe("Edge cases", () => {
  beforeAll(async () => {
    await launchStory("emptyAndEdge");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 0);
  });

  it("renders empty, single-row, then full datasets", async () => {
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 0)).rowCount).toBe(0);

    await gridDriver.tapId("rows-preset-1");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 1)).rowCount).toBe(1);

    await gridDriver.tapId("rows-preset-100");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 100)).rowCount).toBe(100);
  });

  it("survives rapid dataset-size toggling", async () => {
    for (const preset of [100, 0, 1, 100, 0, 1]) {
      await gridDriver.tapId(`rows-preset-${preset}`);
    }
    // Still responsive and consistent after churn.
    const state = await gridDriver.waitForState((s) => s.rowCount === 1, {
      description: "stable after rapid toggling",
    });
    jestExpect(state.rowCount).toBe(1);
    jestExpect(state.columnIds.length).toBeGreaterThan(0);
  });
});
