import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Pinning is observable via GridReportableState.pinnedColumnIds {left,right}.
// Flow: open the column action sheet → Pin Column → Left / Right / None.
const A = gridDriver.action;

describe("Pinning", () => {
  beforeAll(async () => {
    await launchStory("pinning");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("pins a column to the left", async () => {
    await gridDriver.openColumnMenu("pinning", "symbol");
    await gridDriver.tapId(A.pin);
    await gridDriver.tapText("Left");
    const state = await gridDriver.waitForState((s) =>
      s.pinnedColumnIds.left.includes("symbol")
    );
    jestExpect(state.pinnedColumnIds.left).toContain("symbol");
  });

  it("pins a column to the right", async () => {
    await gridDriver.openColumnMenu("pinning", "side");
    await gridDriver.tapId(A.pin);
    await gridDriver.tapText("Right");
    const state = await gridDriver.waitForState((s) =>
      s.pinnedColumnIds.right.includes("side")
    );
    jestExpect(state.pinnedColumnIds.right).toContain("side");
  });

  it("unpins a column", async () => {
    await gridDriver.openColumnMenu("pinning", "symbol");
    await gridDriver.tapId(A.pin);
    await gridDriver.tapText("Left");
    await gridDriver.waitForState((s) => s.pinnedColumnIds.left.includes("symbol"));

    await gridDriver.openColumnMenu("pinning", "symbol");
    await gridDriver.tapId(A.pin);
    await gridDriver.tapText("None");
    const state = await gridDriver.waitForState(
      (s) => !s.pinnedColumnIds.left.includes("symbol")
    );
    jestExpect(state.pinnedColumnIds.left).not.toContain("symbol");
  });
});
