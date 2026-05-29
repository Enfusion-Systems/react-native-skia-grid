import { expect as jestExpect } from "@jest/globals";

import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";

// Sorting is observable via GridReportableState.sortStatus — an ordered list of
// { columnId, sort, sortIndex }. We open the header action sheet and tap the
// sort buttons by their stable testIDs.
const A = gridDriver.action;

describe("Sorting", () => {
  beforeAll(async () => {
    await launchStory("sorting");
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await gridDriver.waitForState((s) => s.rowCount === 100);
  });

  it("sorts a column ascending", async () => {
    await gridDriver.openColumnMenu("sorting", "symbol");
    await gridDriver.tapId(A.sortAsc);
    const state = await gridDriver.waitForState(
      (s) => (s.sortStatus?.length ?? 0) > 0,
      { description: "ascending sort on symbol" }
    );
    jestExpect(state.sortStatus![0].columnId).toBe("symbol");
    jestExpect(state.sortStatus![0].sort).toBe("asc");
  });

  it("sorts a column descending", async () => {
    await gridDriver.openColumnMenu("sorting", "price");
    await gridDriver.tapId(A.sortDesc);
    const state = await gridDriver.waitForState(
      (s) => s.sortStatus?.[0]?.sort === "desc",
      { description: "descending sort on price" }
    );
    jestExpect(state.sortStatus![0].columnId).toBe("price");
    jestExpect(state.sortStatus![0].sort).toBe("desc");
  });

  it("clears sorting", async () => {
    await gridDriver.openColumnMenu("sorting", "symbol");
    await gridDriver.tapId(A.sortAsc);
    await gridDriver.waitForState((s) => (s.sortStatus?.length ?? 0) > 0);

    await gridDriver.tapId(A.sortClear);
    const state = await gridDriver.waitForState(
      (s) => (s.sortStatus?.length ?? 0) === 0,
      { description: "cleared sort" }
    );
    jestExpect(state.sortStatus ?? []).toHaveLength(0);
  });

  // Multi-column sort is built by long-pressing Asc/Desc (adds to the chain).
  // BLOCKED: Detox's synthesized longPress crashes the app on RNGH gesture
  // buttons here — "Inconsistency between local and UIKit touch registries"
  // (RCTSurfaceTouchHandler). There is no imperative sort API to drive it
  // instead, so this stays a tracked gap until the Detox/RNGH touch issue is
  // resolved or a sort imperative API is added. sortStatus already supports
  // multi-column assertions, so only the interaction is missing.
  it.todo("builds a multi-column sort chain via long-press (blocked: Detox longPress touch-registry crash)");
});
