import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// The slots story overrides Text / MutedText / Divider. This verifies the
// override doesn't break the grid or its interactions: the action sheet still
// opens and sorting still works through the (re-styled) sheet.
const A = gridDriver.action;

describe("Slot overrides", () => {
  beforeAll(async () => {
    await launchStory("slots");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("renders and stays interactive with custom slots", async () => {
    const mounted = await gridDriver.waitForState((s) => s.rowCount === 100);
    jestExpect(mounted.columnIds).toHaveLength(5);

    // The action sheet (with overridden Text/Divider slots) still works.
    await gridDriver.openColumnMenu("slots", "symbol");
    await gridDriver.tapId(A.sortAsc);
    const state = await gridDriver.waitForState((s) => (s.sortStatus?.length ?? 0) > 0);
    jestExpect(state.sortStatus![0].columnId).toBe("symbol");
  });
});
