import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Custom rendering (valueFormatter / redIfNegative) changes pixels, not state,
// so the state bridge can only confirm the story mounts with its columns. The
// formatted output + red P&L are visual checks (tracked todos).
describe("Custom cell rendering", () => {
  beforeAll(async () => {
    await launchStory("customRenderers");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("mounts with the custom-render columns", async () => {
    const state = await gridDriver.waitForState((s) => s.rowCount === 100);
    jestExpect(state.columnIds).toEqual(["symbol", "price", "notional", "pnl"]);
  });

  it.todo("valueFormatter output ($price / thousands / signed P&L) — visual, needs screenshot");
  it.todo("redIfNegative colours negative P&L — visual, needs screenshot");
});
