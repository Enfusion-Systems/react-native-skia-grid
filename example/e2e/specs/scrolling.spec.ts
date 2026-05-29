import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// The scroll OFFSET / visible range is not part of GridReportableState, so we
// can only assert that scrolling a large dataset is stable (no crash, row count
// preserved via virtualization). Visible-range assertions are tracked todos.
describe("Scrolling", () => {
  beforeAll(async () => {
    await launchStory("enterprise");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 1000);
  });

  it("scrolls vertically over a large dataset without crashing", async () => {
    await gridDriver.scrollVertical("up");
    await gridDriver.scrollVertical("up");
    await gridDriver.scrollVertical("down");
    const state = await gridDriver.waitForState((s) => s.rowCount === 1000);
    jestExpect(state.rowCount).toBe(1000); // virtualized: count is stable
  });

  it("scrolls horizontally without crashing", async () => {
    await gridDriver.scrollHorizontal("left");
    await gridDriver.scrollHorizontal("right");
    const state = await gridDriver.waitForState((s) => s.rowCount === 1000);
    jestExpect(state.rowCount).toBe(1000);
  });

  it.todo("assert the visible row/column range after scroll (scroll offset not reported by GridReportableState)");
  it.todo("pinned columns stay fixed during horizontal scroll (visual — needs screenshot)");
});
