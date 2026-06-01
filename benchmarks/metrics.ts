/**
 * Pure metric helpers for the Skia-grid performance harness. No Detox / RN
 * imports here so this stays unit-testable and reusable from both the Detox
 * bench specs (example/e2e/bench) and any future Node runner.
 *
 * The signal we record is the **duration (ms) of each redraw cycle** — the span
 * from the grid's React commit (React.Profiler `onRender`) to its
 * `onLayoutComplete` (end of the layer-recording effects). That is the JS work
 * the Phase-2 optimizations reduce. Absolute ms is device-noisy, so all CI
 * assertions compare *relative deltas* against a committed baseline captured on
 * the same pinned simulator (see benchmarks/README.md).
 */

export type BenchStats = {
  count: number;
  /** Median inter-redraw interval, ms. */
  p50: number | null;
  /** 95th-percentile inter-redraw interval, ms. */
  p95: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
};

export type ScenarioResult = {
  id: string;
  /** Doc name, e.g. "B-Scroll-10k". */
  label: string;
  stats: BenchStats;
};

export type BenchReport = {
  /** Baseline key, e.g. "ios-iphone17pro-26_2". */
  device: string;
  timestamp: string;
  results: ScenarioResult[];
};

export type Comparison = {
  id: string;
  label: string;
  metric: "p50" | "p95";
  baseline: number | null;
  current: number | null;
  /** (current - baseline) / baseline. Negative = faster (improvement). */
  deltaPct: number | null;
  /** True when current is slower than baseline by more than the noise band. */
  regressed: boolean;
};

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return sorted[idx];
}

export function computeStats(intervals: number[]): BenchStats {
  if (intervals.length === 0) {
    return { count: 0, p50: null, p95: null, mean: null, min: null, max: null };
  }
  const sorted = [...intervals].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    mean: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

const METRICS: Array<"p50" | "p95"> = ["p50", "p95"];

export function compareReports(
  current: BenchReport,
  baseline: BenchReport,
  noiseBand = 0.05
): Comparison[] {
  const byId = new Map(baseline.results.map((r) => [r.id, r]));
  const out: Comparison[] = [];
  for (const cur of current.results) {
    const base = byId.get(cur.id);
    for (const metric of METRICS) {
      const c = cur.stats[metric];
      const b = base?.stats[metric] ?? null;
      const deltaPct =
        c != null && b != null && b !== 0 ? (c - b) / b : null;
      out.push({
        id: cur.id,
        label: cur.label,
        metric,
        baseline: b,
        current: c,
        deltaPct,
        regressed: deltaPct != null && deltaPct > noiseBand,
      });
    }
  }
  return out;
}

const pct = (v: number | null): string =>
  v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const ms = (v: number | null): string => (v == null ? "—" : `${v.toFixed(2)}ms`);

export function formatComparison(cmps: Comparison[]): string {
  const lines = [
    "| Scenario | Metric | Baseline | Current | Δ | Status |",
    "|---|---|---|---|---|---|",
  ];
  for (const c of cmps) {
    const status = c.regressed
      ? "🔴 regression"
      : c.deltaPct != null && c.deltaPct < -0.05
        ? "🟢 faster"
        : "⚪ neutral";
    lines.push(
      `| ${c.label} | ${c.metric} | ${ms(c.baseline)} | ${ms(c.current)} | ${pct(c.deltaPct)} | ${status} |`
    );
  }
  return lines.join("\n");
}
