import { expect as jestExpect } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";

/**
 * Visual-regression gate for the draw pipeline. Captures a Detox screenshot and
 * diffs it against a committed baseline via jest-image-snapshot (pixelmatch).
 *
 * Scope it to GEOMETRY-dominated surfaces (cell/header background, section
 * separators, overlays) — the Phase-2/3 refactor targets — and avoid glyph-heavy
 * content, since Skia text rasterization is device-dependent and flaky. Always
 * `await gridDriver.waitForState(...)` so a redraw has settled before capturing;
 * never diff a mid-animation frame.
 *
 * Baselines are keyed by device+runtime so an OS bump can't silently rebaseline.
 * Pin the simulator to match (see example/.detoxrc.js).
 */
const DEVICE_KEY = process.env.SNAPSHOT_KEY ?? "ios-iphone17pro-26_2";
const SNAPSHOTS_DIR = path.resolve(
  process.cwd(),
  "e2e",
  "__image_snapshots__",
  DEVICE_KEY
);

export type SnapshotOpts = {
  /** Allowed differing-pixel fraction (0–1). Absorbs sub-pixel AA. */
  failureThreshold?: number;
};

export async function expectScreenshotMatches(
  name: string,
  opts: SnapshotOpts = {}
): Promise<void> {
  const shotPath = await device.takeScreenshot(name);
  const image = fs.readFileSync(shotPath);
  (
    jestExpect(image) as unknown as {
      toMatchImageSnapshot: (o: Record<string, unknown>) => void;
    }
  ).toMatchImageSnapshot({
    customSnapshotsDir: SNAPSHOTS_DIR,
    customDiffDir: path.join(SNAPSHOTS_DIR, "__diff_output__"),
    customSnapshotIdentifier: name,
    failureThreshold: opts.failureThreshold ?? 0.003,
    failureThresholdType: "percent",
    comparisonMethod: "pixelmatch",
  });
}
