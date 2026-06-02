import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Mirrors the library's exported GROUP_COLUMN_NAME constant. Specs run in
// Node/Jest (not through Metro's `../src` alias), so the library can't be
// value-imported here — hence the literal, matching how smoke.spec asserts
// column ids by literal string.
const GROUP_COLUMN_NAME = "Group";

// Grouping is observable via the displayed rowCount: grouping by `side`
// (2 distinct values) collapses the 200 leaf rows to 2 group rows. The grouping
// story shows the grouping pill bar, so header taps are offset below it
// ({ groupBar: true }).
//
// It is also observable via `columnIds`: turning grouping on injects the
// synthetic group column (colId === GROUP_COLUMN_NAME) that carries
// GroupCellRenderer — the renderer that draws the group value AND the
// expand/collapse caret. Its presence/absence in `columnIds` is the regression
// guard for the bug where toggling group at runtime left group rows blank with
// no caret (the group column was never injected).
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
    // 200 leaf rows collapse to 2 group rows (side = Buy / Sell), AND the
    // synthetic group column is injected so the group rows can render their
    // value + caret.
    const state = await gridDriver.waitForState(
      (s) => s.rowCount === 2 && s.columnIds.includes(GROUP_COLUMN_NAME),
      { description: "grouped by side → 2 group rows + injected group column" }
    );
    jestExpect(state.rowCount).toBe(2);
    jestExpect(state.columnIds).toContain(GROUP_COLUMN_NAME);
  });

  it("ungroups rows (restores leaf rows)", async () => {
    await gridDriver.openColumnMenu("grouping", "side", { groupBar: true });
    await gridDriver.tapId(A.group); // group → 2 rows; action sheet closes
    await gridDriver.waitForState((s) => s.rowCount === 2);

    // Grouping is a terminal action that closes the sheet, so ungroup via the
    // grouping pill's ✕ (its dedicated affordance) rather than re-opening the
    // menu — which would also be off-geometry now the group column is present.
    await gridDriver.tapId("grid-group-remove-side"); // ungroup → 200 rows
    const state = await gridDriver.waitForState(
      (s) => s.rowCount === 200 && !s.columnIds.includes(GROUP_COLUMN_NAME),
      { description: "ungrouped → 200 leaf rows + group column removed" }
    );
    jestExpect(state.rowCount).toBe(200);
    jestExpect(state.columnIds).not.toContain(GROUP_COLUMN_NAME);
  });

  it.todo("expand / collapse a group row (needs group-row hit testing)");
  it.todo("verify aggregation VALUES (sum/avg) — visual, not in the state bridge)");
});
