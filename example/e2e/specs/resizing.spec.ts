import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// GridReportableState reports sectionWidths (left/center/right section totals)
// but NOT per-column widths, and Detox can't reliably drive the resize-handle
// drag on the Skia canvas. So we assert the section-width structure is reported,
// and track the interaction-level resize scenarios as todos.
describe("Resizing", () => {
  beforeAll(async () => {
    await launchStory("sorting"); // basic columns, all canResize, no grouping bar
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("reports section widths", async () => {
    const state = await gridDriver.waitForState((s) => s.rowCount === 100);
    jestExpect(state.sectionWidths).toHaveProperty("center");
    jestExpect(typeof state.sectionWidths.center).toBe("number");
    jestExpect(state.sectionWidths.center).toBeGreaterThan(0);
  });

  it.todo("drag a column resize handle and assert the new width (canvas drag not automatable via Detox)");
  it.todo("auto-size a column from the action sheet (opens AutoSizeMenu sub-screen — flow not yet automated)");
  it.todo("MIN_COLUMN_SIZE clamp on over-shrink (needs per-column width, not in the state bridge)");
});
