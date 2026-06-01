import * as React from "react";
import { Pressable, View } from "react-native";

/**
 * Performance bench bridge for the Detox-driven harness (benchmarks/).
 *
 * We measure the **duration of each grid redraw cycle**: `markStart()` is called
 * from a `React.Profiler` `onRender` (fires right after the grid commits, before
 * its layer-recording effects run), and `sample()` is called from the grid's
 * `onLayoutComplete` (end of the redraw). The delta is the JS work spent
 * recording that redraw — exactly what the Phase-2 optimizations reduce. p50/p95
 * over the gesture window are exposed via a hidden `grid-bench` view's
 * accessibilityLabel (read like the state bridge). A hidden `grid-bench-reset`
 * control clears the window so the harness can exclude the initial mount/load.
 *
 * Cost is deliberately tiny: per redraw it's two `now()` reads + an array push;
 * stats publish to React state at most ~5×/sec. Critically, publishing must NOT
 * flow back into the grid's props (see StoryScaffold) or the grid never idles.
 * This lives entirely in the example app — the published library API is
 * untouched.
 */
export const BENCH_BRIDGE_TEST_ID = "grid-bench";
export const BENCH_RESET_TEST_ID = "grid-bench-reset";

export type BenchStats = {
  count: number;
  /** Median redraw duration, ms. */
  p50: number | null;
  /** 95th-percentile redraw duration, ms. */
  p95: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
};

const now = (): number => {
  const perf = (globalThis as { performance?: { now?: () => number } })
    .performance;
  return perf?.now ? perf.now() : Date.now();
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function compute(samples: number[]): BenchStats {
  if (samples.length === 0) {
    return { count: 0, p50: null, p95: null, mean: null, min: null, max: null };
  }
  const sorted = [...samples].sort((a, b) => a - b);
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

const EMPTY = compute([]);

export type BenchBridgeApi = {
  /** Call from a React.Profiler `onRender` on the grid subtree (redraw start). */
  markStart: () => void;
  /** Call from the grid's `onLayoutComplete` (redraw end) to record a duration. */
  sample: () => void;
  /** Clear the sample window (hidden reset control / harness boundary). */
  reset: () => void;
  stats: BenchStats;
};

export function useBenchBridge(): BenchBridgeApi {
  const samplesRef = React.useRef<number[]>([]);
  const startRef = React.useRef<number | null>(null);
  const lastPublishRef = React.useRef<number>(0);
  const [stats, setStats] = React.useState<BenchStats>(EMPTY);

  const markStart = React.useCallback(() => {
    // Latest commit before onLayoutComplete wins; spurious commits in between
    // are harmlessly overwritten.
    startRef.current = now();
  }, []);

  const sample = React.useCallback(() => {
    const t0 = startRef.current;
    if (t0 == null) return;
    startRef.current = null;
    const t = now();
    samplesRef.current.push(t - t0);
    if (t - lastPublishRef.current > 200) {
      lastPublishRef.current = t;
      setStats(compute(samplesRef.current));
    }
  }, []);

  const reset = React.useCallback(() => {
    samplesRef.current = [];
    startRef.current = null;
    lastPublishRef.current = 0;
    setStats(EMPTY);
  }, []);

  return { markStart, sample, reset, stats };
}

export function BenchBridge({
  stats,
  onReset,
}: {
  stats: BenchStats;
  onReset: () => void;
}): React.ReactElement {
  const label = React.useMemo(() => JSON.stringify(stats), [stats]);
  return (
    <>
      <View
        testID={BENCH_BRIDGE_TEST_ID}
        accessible
        accessibilityLabel={label}
        style={{ width: 1, height: 1, opacity: 0, position: "absolute" }}
      />
      {/* Near-invisible but tappable (opacity 0 hides from Detox visibility). */}
      <Pressable
        testID={BENCH_RESET_TEST_ID}
        accessible
        accessibilityLabel="bench-reset"
        onPress={onReset}
        style={{
          width: 8,
          height: 8,
          opacity: 0.01,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
    </>
  );
}
