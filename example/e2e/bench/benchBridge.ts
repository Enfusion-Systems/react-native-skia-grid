import type { BenchStats } from "../../../benchmarks/metrics";

const BENCH_BRIDGE_TEST_ID = "grid-bench";
const BENCH_RESET_TEST_ID = "grid-bench-reset";

/** Clear the bench sample window (excludes the initial mount/data-load). */
export async function resetBench(): Promise<void> {
  try {
    await element(by.id(BENCH_RESET_TEST_ID)).tap();
  } catch {
    // Best-effort: if the hidden control can't be tapped, the harness falls
    // back to discarding warm-up samples via the launch remount.
  }
}

/** Read the published p50/p95 inter-redraw stats from the bench bridge. */
export async function readBench(): Promise<BenchStats | null> {
  const raw = (await element(by.id(BENCH_BRIDGE_TEST_ID)).getAttributes()) as {
    label?: string;
    text?: string;
  };
  const label = raw.label ?? raw.text ?? "";
  if (!label) return null;
  try {
    return JSON.parse(label) as BenchStats;
  } catch {
    return null;
  }
}
