import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// The active cell is observable via GridReportableState.editingCell
// ({ rowId, colId }). Tapping a cell makes it the active/edit cell.
describe("Cell editing", () => {
  beforeAll(async () => {
    await launchStory("cellEditing");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 50);
  });

  it("reports the active editing cell on tap", async () => {
    await gridDriver.tapCell("cellEditing", 0, "quantity");
    const state = await gridDriver.waitForState((s) => s.editingCell !== null, {
      description: "editing cell set",
    });
    jestExpect(state.editingCell).toEqual({ rowId: "row-0", colId: "quantity" });
  });

  it("moves the editing cell when another cell is tapped", async () => {
    await gridDriver.tapCell("cellEditing", 0, "quantity");
    await gridDriver.waitForState((s) => s.editingCell?.colId === "quantity");

    await gridDriver.tapCell("cellEditing", 1, "price");
    const state = await gridDriver.waitForState(
      (s) => s.editingCell?.colId === "price"
    );
    jestExpect(state.editingCell).toEqual({ rowId: "row-1", colId: "price" });
  });

  it.todo("commit an edited value through the editor input (text entry not yet automated)");
});
