import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Selection is observable via GridReportableState.selectedRowIds. The selection
// story uses rowSelection="multiple" + rowSelectWithPress, so tapping a row
// cell toggles its selection.
describe("Selection", () => {
  beforeAll(async () => {
    await launchStory("selection");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("toggles a single row on tap", async () => {
    await gridDriver.tapCell("selection", 0, "symbol");
    let state = await gridDriver.waitForState((s) => s.selectedRowIds.length === 1);
    jestExpect(state.selectedRowIds).toContain("row-0");

    await gridDriver.tapCell("selection", 0, "symbol");
    state = await gridDriver.waitForState((s) => s.selectedRowIds.length === 0);
    jestExpect(state.selectedRowIds).toEqual([]);
  });

  it("multi-selects rows", async () => {
    await gridDriver.tapCell("selection", 0, "symbol");
    await gridDriver.tapCell("selection", 1, "symbol");
    const state = await gridDriver.waitForState((s) => s.selectedRowIds.length === 2);
    jestExpect(state.selectedRowIds).toEqual(
      jestExpect.arrayContaining(["row-0", "row-1"])
    );
  });

  it("selects all via the header checkbox", async () => {
    // The header checkbox lives in the leading "__sel" column.
    await gridDriver.tapHeader("selection", "__sel");
    const state = await gridDriver.waitForState((s) => s.selectedRowIds.length === 100, {
      description: "select-all via header checkbox",
    });
    jestExpect(state.selectedRowIds).toHaveLength(100);

    await gridDriver.tapHeader("selection", "__sel");
    const cleared = await gridDriver.waitForState((s) => s.selectedRowIds.length === 0);
    jestExpect(cleared.selectedRowIds).toEqual([]);
  });
});
