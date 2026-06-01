import { expect as jestExpect } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";

import {
  compareReports,
  formatComparison,
  type BenchReport,
  type BenchStats,
  type ScenarioResult,
} from "../../../benchmarks/metrics";
import {
  BASELINE_KEY,
  SCENARIOS,
  type Scenario,
} from "../../../benchmarks/scenarios";
import { gridDriver } from "../helpers/gridDriver";
import { launchStory } from "../helpers/launchStory";
import { readBench, resetBench } from "./benchBridge";

// Detox runs jest from example/, so the repo-root benchmarks/ dir is one up.
const BENCH_DIR = path.resolve(process.cwd(), "..", "benchmarks");
const REPORTS_DIR = path.join(BENCH_DIR, "reports");
const BASELINES_DIR = path.join(BENCH_DIR, "baselines");
const BASELINE_FILE = path.join(BASELINES_DIR, `${BASELINE_KEY}.json`);

const settle = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

const emptyStats = (): BenchStats => ({
  count: 0,
  p50: null,
  p95: null,
  mean: null,
  min: null,
  max: null,
});

async function drive(s: Scenario): Promise<void> {
  switch (s.id) {
    case "scroll-v-10k":
      for (let i = 0; i < s.swipes; i++) {
        await gridDriver.scrollVertical(i % 2 === 0 ? "up" : "down", 0.6);
      }
      break;
    case "scroll-h-10k":
      for (let i = 0; i < s.swipes; i++) {
        await gridDriver.scrollHorizontal(i % 2 === 0 ? "left" : "right", 0.6);
      }
      break;
    case "sort-toggle": {
      // Open the action sheet ONCE, then alternate asc/desc on the same open
      // sheet (re-tapping the header would toggle the sheet closed). Each toggle
      // forces a re-sort redraw, which is what we sample.
      await gridDriver.openColumnMenu("sorting", "symbol");
      for (let i = 0; i < s.swipes; i++) {
        await gridDriver.tapId(gridDriver.action.sortAsc);
        await gridDriver.waitForState((st) => st.sortStatus?.[0]?.sort === "asc");
        await gridDriver.tapId(gridDriver.action.sortDesc);
        await gridDriver.waitForState(
          (st) => st.sortStatus?.[0]?.sort === "desc"
        );
      }
      await gridDriver.tapId(gridDriver.action.sortClear);
      break;
    }
  }
}

async function runScenario(s: Scenario): Promise<ScenarioResult> {
  await launchStory(s.story);
  if (s.rows != null) {
    await gridDriver.tapId(`rows-preset-${s.rows}`);
    await gridDriver.waitForState((st) => st.rowCount === s.rows, {
      timeout: 30000,
      description: `${s.label}: rows=${s.rows}`,
    });
  } else {
    await gridDriver.waitForState((st) => st.rowCount > 0);
  }
  await settle(300); // let the data-load redraws drain before we start sampling
  await resetBench();
  await drive(s);
  await settle(500); // allow the throttled bench publish to flush
  const stats = (await readBench()) ?? emptyStats();
  return { id: s.id, label: s.label, stats };
}

// Perf is measured as the inter-`onLayoutComplete` interval during a scripted
// gesture (a relative proxy for JS-thread redraw cadence). Runs only via
// `yarn bench:ios` (separate jest config), never in the correctness suite.
describe("perf benchmarks", () => {
  const results: ScenarioResult[] = [];

  for (const s of SCENARIOS) {
    it(`measures ${s.label}`, async () => {
      const r = await runScenario(s);
      results.push(r);
      jestExpect(r.stats.count).toBeGreaterThan(0);
    });
  }

  it("writes report and compares against the committed baseline", async () => {
    const report: BenchReport = {
      device: BASELINE_KEY,
      timestamp: new Date().toISOString(),
      results,
    };
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const out = path.join(REPORTS_DIR, `${BASELINE_KEY}-${Date.now()}.json`);
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    // eslint-disable-next-line no-console
    console.log(`\n[bench] wrote ${out}`);

    if (process.env.BENCH_UPDATE_BASELINE) {
      fs.mkdirSync(BASELINES_DIR, { recursive: true });
      fs.writeFileSync(BASELINE_FILE, JSON.stringify(report, null, 2));
      // eslint-disable-next-line no-console
      console.log(`[bench] updated baseline ${BASELINE_FILE}`);
      return;
    }

    if (!fs.existsSync(BASELINE_FILE)) {
      // eslint-disable-next-line no-console
      console.log(
        `[bench] no baseline at ${BASELINE_FILE} — run with BENCH_UPDATE_BASELINE=1 to record one.`
      );
      return;
    }

    const baseline = JSON.parse(
      fs.readFileSync(BASELINE_FILE, "utf8")
    ) as BenchReport;
    const cmps = compareReports(report, baseline);
    // eslint-disable-next-line no-console
    console.log("\n[bench] vs baseline:\n" + formatComparison(cmps));
    if (process.env.BENCH_ASSERT) {
      jestExpect(cmps.filter((c) => c.regressed)).toEqual([]);
    }
  });
});
