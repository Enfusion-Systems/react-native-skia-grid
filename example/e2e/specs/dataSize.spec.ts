import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Runtime data-size controls (the "increase rows/columns at run-time"
// requirement). Row count is observable as rowCount; column add/remove as the
// length of columnIds.
describe("Data size (runtime rows & columns)", () => {
  beforeAll(async () => {
    await launchStory("basic");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("changes the row count via presets", async () => {
    await gridDriver.tapId("rows-preset-1000");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 1000)).rowCount).toBe(1000);

    await gridDriver.tapId("rows-preset-0");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 0)).rowCount).toBe(0);

    await gridDriver.tapId("rows-preset-100");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 100)).rowCount).toBe(100);
  });

  it("scales to 10k rows", async () => {
    await gridDriver.tapId("rows-preset-10000");
    const state = await gridDriver.waitForState((s) => s.rowCount === 10000, {
      timeout: 15000,
      description: "10k rows mounted",
    });
    jestExpect(state.rowCount).toBe(10000);
  });

  it("adds and removes columns at runtime", async () => {
    const base = (await gridDriver.waitForState((s) => s.rowCount === 100))
      .columnIds.length;

    await gridDriver.tapId("cols-inc");
    jestExpect(
      (await gridDriver.waitForState((s) => s.columnIds.length === base + 1))
        .columnIds.length
    ).toBe(base + 1);

    await gridDriver.tapId("cols-dec");
    jestExpect(
      (await gridDriver.waitForState((s) => s.columnIds.length === base))
        .columnIds.length
    ).toBe(base);
  });
});
