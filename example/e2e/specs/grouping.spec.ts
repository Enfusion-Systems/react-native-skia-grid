import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Grouping is observable via the displayed rowCount: grouping by `side`
// (2 distinct values) collapses the 200 leaf rows to 2 group rows. The grouping
// story shows the grouping pill bar, so header taps are offset below it
// ({ groupBar: true }).
const A = gridDriver.action;

describe("Grouping", () => {
  beforeAll(async () => {
    await launchStory("grouping");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 200);
  });

  it("groups rows by a column (collapses to group rows)", async () => {
    await gridDriver.openColumnMenu("grouping", "side", { groupBar: true });
    await gridDriver.tapId(A.group);
    // 200 leaf rows collapse to 2 group rows (side = Buy / Sell).
    const state = await gridDriver.waitForState((s) => s.rowCount === 2, {
      description: "grouped by side → 2 collapsed group rows",
    });
    jestExpect(state.rowCount).toBe(2);
  });

  it("ungroups rows (restores leaf rows)", async () => {
    await gridDriver.openColumnMenu("grouping", "side", { groupBar: true });
    await gridDriver.tapId(A.group); // group → 2 rows
    await gridDriver.waitForState((s) => s.rowCount === 2);

    // The sheet stays open; the button now reads "Ungroup" (same testID).
    await gridDriver.tapId(A.group); // ungroup → 200 rows
    const state = await gridDriver.waitForState((s) => s.rowCount === 200, {
      description: "ungrouped → 200 leaf rows",
    });
    jestExpect(state.rowCount).toBe(200);
  });

  it.todo("expand / collapse a group row (needs group-row hit testing)");
  it.todo("verify aggregation VALUES (sum/avg) — visual, not in the state bridge)");
});
