import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";
import { expectScreenshotMatches } from "../helpers/visualSnapshot";

/**
 * Geometry-dominated visual baselines that guard the draw pipeline against
 * Phase-2/3 regressions (B1 paint pool, B3 per-section re-record gating, C1–C3
 * worklet promotion). These are a regression SAFETY NET, not the themingDensity
 * / customRenderer visual *feature* todos (tracked separately in CHANGELOG.md).
 *
 * On first run with no baseline, jest-image-snapshot writes + commits the
 * baseline (run normally). In CI we pass `--ci`, so a missing baseline fails
 * instead of silently passing. Runs in the full suite, never in smoke.
 */
describe("Visual baselines (geometry)", () => {
  it("basic grid renders to baseline", async () => {
    await launchStory("basic");
    await gridDriver.waitForState((s) => s.rowCount === 100, {
      description: "basic grid mounted",
    });
    await expectScreenshotMatches("basic-grid");
  });

  it("pinned columns render to baseline", async () => {
    await launchStory("pinning");
    await gridDriver.waitForState((s) => s.rowCount > 0, {
      description: "pinning story mounted",
    });
    await expectScreenshotMatches("pinning-initial");
  });
});
