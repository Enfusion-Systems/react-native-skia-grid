import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Filtering is observable via filterColumnIds (which columns have an active
// filter) and the filtered rowCount. We drive the set filter on "symbol":
// opening it and toggling "(Select all)" off applies a filter that matches
// nothing.
const A = gridDriver.action;

describe("Filtering", () => {
  beforeAll(async () => {
    await launchStory("filtering");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("applies a set filter (deselect all → no matches)", async () => {
    await gridDriver.openColumnMenu("filtering", "symbol");
    await gridDriver.tapId(A.filter);
    // The set filter opens with everything selected; toggle "(Select all)" off.
    await gridDriver.tapText("(Select all)");
    const state = await gridDriver.waitForState(
      (s) => s.filterColumnIds.includes("symbol"),
      { description: "set filter active on symbol" }
    );
    jestExpect(state.filterColumnIds).toContain("symbol");
    jestExpect(state.rowCount).toBe(0);
  });

  it("restores all rows when the set filter is re-selected", async () => {
    await gridDriver.openColumnMenu("filtering", "symbol");
    await gridDriver.tapId(A.filter);

    // Deselect all → filter matches nothing.
    await gridDriver.tapText("(Select all)");
    jestExpect((await gridDriver.waitForState((s) => s.rowCount === 0)).rowCount).toBe(0);

    // Re-select all on the same screen → all rows visible again.
    await gridDriver.tapText("(Select all)");
    const state = await gridDriver.waitForState((s) => s.rowCount === 100, {
      description: "rows restored after re-selecting all",
    });
    jestExpect(state.rowCount).toBe(100);
  });

  it.todo("number / text / date filters via ConditionsList inputs (text entry not yet automated)");
  it.todo("multi-column AND filter narrows results across columns");
});
