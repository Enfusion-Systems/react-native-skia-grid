import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Theme + density are visual; the state bridge can't see colors/metrics. So we
// assert the toggles don't break the grid (it keeps rendering its data), and
// leave pixel-level checks as tracked todos (need screenshot diffing).
describe("Theming & density", () => {
  beforeAll(async () => {
    await launchStory("themingDensity");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("keeps rendering data through theme + density changes", async () => {
    await gridDriver.tapId("theme-light");
    await gridDriver.tapId("density-high");
    await gridDriver.tapId("density-low");
    await gridDriver.tapId("theme-dark");
    await gridDriver.tapId("density-medium");

    const state = await gridDriver.waitForState((s) => s.rowCount === 100, {
      description: "grid stable after theme/density toggles",
    });
    jestExpect(state.rowCount).toBe(100);
    jestExpect(state.columnIds).toHaveLength(5);
  });

  it.todo("light vs dark theme visual snapshot (needs screenshot diffing)");
  it.todo("high/medium/low density row-height visual snapshot (needs screenshot diffing)");
});
