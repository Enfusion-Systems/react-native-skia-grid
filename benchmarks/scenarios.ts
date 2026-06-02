/**
 * Benchmark scenario definitions (doc §4.1). Pure data — the Detox-driven
 * gesture sequence for each id lives in example/e2e/bench/perf.bench.ts, keyed
 * by `id`. Each scenario launches an existing showcase story, optionally sets a
 * row preset, then runs a scripted gesture loop while sampling the bench bridge.
 *
 * Only reliably-automatable gestures are wired (scroll swipes, header-menu
 * taps). B-Resize (canvas resize-handle drag) and the multi-step B-Filter-Apply
 * flow are intentionally NOT scripted here — the resize handle isn't Detox-
 * automatable (see example/e2e/specs/resizing.spec.ts) and filter text-entry is
 * a tracked e2e gap. They remain doc §4.1 targets to validate manually.
 */

export type ScenarioId = "scroll-v-10k" | "scroll-h-10k" | "sort-toggle";

export type Scenario = {
  id: ScenarioId;
  /** Doc name. */
  label: string;
  /** Story id to launch (example/src/stories/registry.ts). */
  story: string;
  /** Row preset to apply before measuring (tap `rows-preset-<n>`); omit to keep default. */
  rows?: number;
  /** Number of scripted gesture repetitions to sample over. */
  swipes: number;
  /**
   * Allowed slowdown vs baseline before CI fails (fraction). Absolute ms is
   * device-noisy, so we only flag regressions beyond this band.
   */
  noiseBand: number;
  /**
   * Informational Phase-2 target improvement (fraction, negative = faster) from
   * doc §4.2 — used to label PRs, not to fail CI.
   */
  targetDelta?: number;
};

export const BASELINE_KEY = "ios-iphone17pro-26_2";

export const SCENARIOS: Scenario[] = [
  {
    id: "scroll-v-10k",
    label: "B-Scroll-10k (vertical)",
    story: "enterprise",
    rows: 10000,
    swipes: 20,
    noiseBand: 0.05,
    targetDelta: -0.3,
  },
  {
    id: "scroll-h-10k",
    label: "B-Scroll-10k (horizontal, pinned)",
    story: "enterprise",
    rows: 10000,
    swipes: 16,
    noiseBand: 0.05,
    targetDelta: -0.3,
  },
  {
    id: "sort-toggle",
    label: "B-Sort-Toggle",
    story: "sorting",
    swipes: 6,
    noiseBand: 0.05,
    targetDelta: -0.15,
  },
];
