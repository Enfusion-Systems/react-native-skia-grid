# Performance benchmarks

A Detox-driven harness that measures JS-thread redraw cadence for the Skia grid,
so the Phase-2/3 refactor (see `docs/skia-grid-refactor.md` §4) can be validated
**measurement-first** — no draw-pipeline change merges without a recorded win and
no regression.

## The signal

We measure the **duration of each redraw cycle**: a `React.Profiler` around the
grid marks the redraw start (its `onRender` fires right after the grid commits,
before the layer-recording effects run), and the grid's `onLayoutComplete` marks
the end. The delta is the JS work spent recording that redraw — exactly what the
Phase-2 optimizations reduce. p50/p95 of those durations are the metric. This
needs **no change to the published library API** — the example app computes the
stats in `BenchBridge`
([example/src/components/BenchBridge.tsx](../example/src/components/BenchBridge.tsx))
and exposes them on a hidden `grid-bench` view, read the same way as the state
bridge.

> Note: scroll scenarios capture relatively few redraws (the grid scrolls on the
> UI thread; JS redraws fire only on buffer refills), so each sample is a real
> redraw duration but the per-scenario `count` is small — `sort-toggle` (discrete
> re-sorts) gives the densest, most stable distribution. If a Phase-2 scroll gate
> needs tighter percentiles, deepen the scroll drive (unidirectional traversal)
> in `example/e2e/bench/perf.bench.ts` and re-record the baseline.

Absolute milliseconds are device- and load-noisy, so CI **only compares relative
deltas against a committed baseline captured on the same pinned simulator**
(iPhone 17 Pro / iOS 26.2, per `example/.detoxrc.js`). The doc's absolute targets
(`< 4 ms` etc.) are Phase-3 acceptance checks run manually on the named reference
devices, not CI gates.

## Layout

| Path | Role |
|---|---|
| `metrics.ts` | pure stats (percentiles) + baseline comparison + report formatting |
| `scenarios.ts` | scenario definitions (story, rows, gesture count, noise band) |
| `.detoxrc.bench.js` | thin Detox config — reuses the example app, swaps the jest runner config |
| `baselines/<key>.json` | committed baseline per device key |
| `reports/` | per-run output (gitignored) |
| `../example/e2e/bench/perf.bench.ts` | the Detox driver that scripts gestures + writes/compares reports |
| `../example/e2e/jest.bench.config.js` | jest config scoped to `e2e/bench/**/*.bench.ts` |

## Running

Prereqs (same as the e2e suite): a Debug build + a running Metro, on the pinned
sim. From `example/`:

```bash
yarn build:ios          # once (clean xcodebuild, ~17 min)
yarn start              # Metro, separate terminal
yarn bench:ios          # run the benchmark scenarios
```

- **Record/refresh the baseline:** `BENCH_UPDATE_BASELINE=1 yarn bench:ios`,
  then commit `baselines/ios-iphone17pro-26_2.json`.
- **Gate a PR (fail on regression beyond the noise band):**
  `BENCH_ASSERT=1 yarn bench:ios`.
- Every run also writes a timestamped report to `reports/` for drift tracking.

## Scenarios

| id | doc name | drives |
|---|---|---|
| `scroll-v-10k` | B-Scroll-10k (vertical) | enterprise @ 10k rows, alternating vertical swipes |
| `scroll-h-10k` | B-Scroll-10k (horizontal) | enterprise @ 10k rows, alternating horizontal swipes (exercises pinned isolation — relevant to B3) |
| `sort-toggle` | B-Sort-Toggle | sorting story, repeated sort apply/clear |

**Not scripted (intentional):** B-Resize (the canvas resize-handle drag isn't
Detox-automatable — see `example/e2e/specs/resizing.spec.ts`) and the multi-step
B-Filter-Apply text-entry flow (a tracked e2e gap). Validate those manually
against the doc §4.1 targets.

## Noise control

`maxWorkers: 1`; the harness resets the sample window after the data-load and
before the gesture loop (`grid-bench-reset`); take median-of-3 runs for anything
you act on. Keep the simulator runtime identical to the baseline key.
