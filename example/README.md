# `react-native-skia-grid` — example app

A Storybook-style showcase **and** the test host for the library. It serves three roles:

1. **Showcase** — a navigable gallery of feature stories (sorting, filtering, pinning, grouping, selection, cell editing, theming, slots, an enterprise 10k-row scenario, edge cases).
2. **End-to-end test host** — a Detox suite drives the stories on a real simulator and asserts behavior through a hidden state bridge (the grid draws to a Skia canvas, so there are no per-cell native views to match).
3. **Performance & visual-regression harness** — a Detox-driven benchmark of redraw cadence plus pixel-level snapshot checks, both baseline-tracked on a pinned simulator.

This app is **not published**; it consumes the library directly from `../src` via a Babel/Metro alias, so there is no `yarn build` step during development — edits to the library are picked up live.

## Contents

- [Layout](#layout)
- [First-time setup](#first-time-setup)
- [Running the app](#running-the-app)
- [Stories](#stories)
- [How the testability bridge works](#how-the-testability-bridge-works)
- [End-to-end tests (Detox)](#end-to-end-tests-detox)
- [Performance benchmarks](#performance-benchmarks)
- [Visual regression](#visual-regression)
- [Continuous integration](#continuous-integration)
- [Writing new specs](#writing-new-specs)
- [Regenerating the iOS project](#regenerating-the-ios-project)
- [Known caveats](#known-caveats)

## Layout

```
example/
├── App.tsx                     ← root providers (gesture handler, bottom-sheet, safe area)
│                                 + native-stack navigator wired to the story registry
├── index.js                    ← AppRegistry entry
├── app.json                    ← RN manifest (name = SkiaGridExample)
├── babel.config.js             ← module-resolver alias: react-native-skia-grid → ../src
├── metro.config.js             ← watchFolders for the parent library source
├── .detoxrc.js                 ← Detox config (iOS sim: iPhone 17 Pro / iOS 26.2)
├── Gemfile / .ruby-version     ← CocoaPods Ruby pin
├── ios/                        ← RN 0.79 template, renamed to SkiaGridExample
│   └── SkiaGridExample.xcworkspace   ← open THIS in Xcode (not the .xcodeproj)
├── src/
│   ├── StateBridge.tsx         ← hidden view; JSON-serializes grid state into accessibilityLabel
│   ├── seededData.ts           ← Mulberry32-seeded deterministic rows + column presets
│   ├── components/
│   │   ├── StoryScaffold.tsx   ← shared chrome; wires Grid → StateBridge + bench bridge
│   │   ├── BenchBridge.tsx     ← per-redraw duration meter, exposed on a hidden `grid-bench` view
│   │   └── DataSizeControls.tsx← run-time row/column count controls
│   └── stories/
│       ├── registry.ts         ← the list of stories (id, title, Component)
│       ├── StoriesListScreen.tsx
│       ├── _grid.ts            ← typed Grid instance for the stories
│       └── *.tsx               ← one file per story (basic, sorting, filtering, …)
└── e2e/
    ├── jest.config.js          ← correctness suite runner (+ visual setup)
    ├── jest.bench.config.js    ← benchmark runner (scoped to bench/**/*.bench.ts)
    ├── setupVisual.ts          ← registers jest-image-snapshot's matcher
    ├── helpers/
    │   ├── gridDriver.ts       ← declarative interaction helpers (tap/swipe/menu/state)
    │   ├── stateBridge.ts      ← readGridState / waitForGridState
    │   ├── launchStory.ts      ← deep-link launch into a given story
    │   ├── columnGeometry.ts   ← column-position math for gesture targeting
    │   └── visualSnapshot.ts   ← expectScreenshotMatches(name)
    ├── specs/                  ← feature specs (one per story) + smoke + visualBaseline
    └── bench/
        ├── perf.bench.ts       ← scripts gestures, samples the bench bridge, writes/compares reports
        └── benchBridge.ts      ← reads the `grid-bench` view / resets the sample window
```

The benchmark definitions and baselines live one level up, in [`../benchmarks/`](../benchmarks).

## First-time setup

Tested with: macOS 14+, Node 20+, Yarn 1.22, Xcode 16+, Ruby 3.x (Homebrew), CocoaPods 1.16+, `applesimutils`.

### 1. Homebrew deps (for Detox)

```bash
brew tap wix/brew
brew install applesimutils
```

`applesimutils` lets Detox drive iOS simulators. If `pod install` fails on the macOS system Ruby, install a newer Ruby (`brew install ruby@3.3`) and put it on `PATH` before running pods.

### 2. JS deps

```bash
cd example
yarn install
```

> The example declares `uuid`, `lodash`, and `date-fns` as direct deps even though they're runtime deps of the parent library: because the library is consumed via source-alias (not the published artifact), Yarn won't hoist them transitively. `jest-image-snapshot` is a devDep here for the visual suite — run `yarn install` after pulling if you don't have it yet.

### 3. Pods (iOS)

```bash
cd example/ios && pod install
```

### 4. Verify the simulator

```bash
xcrun simctl list devices "iPhone 17 Pro"
```

If empty, edit `.detoxrc.js` to pin a simulator you actually have installed — it must match a real device family, and (for visual/bench baselines) the same runtime as the baseline key (`ios-iphone17pro-26_2`).

## Running the app

```bash
cd example
yarn start          # Metro (terminal 1)
yarn ios            # build & launch on the simulator (terminal 2)
# or: yarn android
```

The app opens on the **Stories** list. Tap a story to open it; the per-screen "Stories" header button returns to the list.

**Deep-linking to a story:** launch with `launchArgs: { story: <id> }` (Detox sets this; iOS exposes it via `NSUserDefaults`, which `App.tsx` reads through RN's `Settings`). The app also remembers the last story across reloads, so the e2e suite can run a single app instance and navigate between stories instead of relaunching.

## Stories

| id | Title | What it shows |
|---|---|---|
| `basic` | Basic grid | 5 columns × 100 rows, single select, run-time data-size controls |
| `sorting` | Sorting | Single + multi-column sort via the header action sheet |
| `filtering` | Filtering | Set / text / number / date filters |
| `pinning` | Pinning | Pin columns left/right; pinned sections stay fixed on horizontal scroll |
| `grouping` | Grouping & aggregation | Group by a column; sum / avg aggregations |
| `selection` | Selection | Multi-row selection with checkboxes + select-all |
| `cellEditing` | Cell editing | Editable cells; reports `editingCell` |
| `themingDensity` | Theming & density | Swap theme + density at run-time |
| `slots` | Slot overrides | Replace built-in UI components via the `slots` prop |
| `customRenderers` | Custom cell rendering | `valueFormatter` + `redIfNegative` |
| `imperativeApi` | Imperative API | Drive the grid through its ref (`SkiaGridAPI`) |
| `enterprise` | Enterprise (large data) | 1k–10k rows, pinned + filter + sort + group |
| `emptyAndEdge` | Empty & edge cases | 0 / 1 / 100 rows, `noDataText` |

Stories are registered in [`src/stories/registry.ts`](src/stories/registry.ts) and share the [`StoryScaffold`](src/components/StoryScaffold.tsx) chrome.

## How the testability bridge works

The grid draws to a single `Canvas`, so Detox can't find cells with `by.id()` — no native view per cell exists. Instead:

1. The grid emits `onLayoutComplete(state)` after each React-state-driven redraw (see [`../src/renderer/GridCanvas.tsx`](../src/renderer/GridCanvas.tsx)).
2. `StoryScaffold` stores that state and renders `<StateBridge state={state} />`.
3. `StateBridge` exposes a hidden `<View testID="grid-state">` whose `accessibilityLabel` is `JSON.stringify(state)`.
4. Specs call `readGridState()` / `waitForGridState(predicate)`, which fetch the label via `element(by.id("grid-state")).getAttributes()` and `JSON.parse` it.

The reported shape is `GridReportableState` (see [`../src/core/types/grid.ts`](../src/core/types/grid.ts)) — selection, row count, column ids, pinned ids, sort status, filtered columns, editing cell, section widths.

> **Do not** set `accessibilityElementsHidden` / `importantForAccessibility="no"` on the bridge view — both also hide it from Detox's matcher on iOS. Use zero opacity and keep the payload reasonably small (under ~4 KB) to avoid `accessibilityLabel` truncation.

## End-to-end tests (Detox)

Build once, then run the suite:

```bash
cd example
yarn build:ios                 # Debug build for Detox (slow, one-time / on native change)
yarn start                     # Metro, separate terminal

yarn e2e:ios                   # full correctness suite
yarn e2e:ios:smoke             # just e2e/specs/smoke.spec.ts (fast sanity)
```

Specs live in [`e2e/specs/`](e2e/specs) — one per story (`sorting`, `filtering`, `pinning`, `grouping`, `selection`, `cellEditing`, `customRenderers`, `imperativeApi`, `slots`, `themingDensity`, `scrolling`, `resizing`, `dataSize`, `edgeCases`) plus `smoke` and `visualBaseline`. Interactions go through `gridDriver` so specs stay refactor-tolerant. Specs run sequentially (`maxWorkers: 1` — one simulator). Android config is sketched in `.detoxrc.js` but the `android/` project isn't wired up yet.

Known intentionally-untested interactions (tooling limits) are tracked in [`e2e/CHANGELOG.md`](e2e/CHANGELOG.md).

## Performance benchmarks

A measurement-first harness that times the **JS work per redraw** so draw-pipeline changes can be validated against a committed baseline — no change merges without a recorded win and no regression.

**Signal:** a `React.Profiler` around the grid (in `StoryScaffold`, dev/bench only) marks redraw start; the grid's `onLayoutComplete` marks the end. `BenchBridge` computes p50/p95 of those durations and exposes them on a hidden `grid-bench` view, read like the state bridge. No change to the published library API.

```bash
cd example
yarn build:ios                 # once
yarn start                     # Metro, separate terminal
yarn bench:ios                 # run the benchmark scenarios

BENCH_UPDATE_BASELINE=1 yarn bench:ios   # record/refresh the baseline, then commit it
BENCH_ASSERT=1 yarn bench:ios            # fail on regression beyond the noise band
```

Scenarios (`scroll-v-10k`, `scroll-h-10k`, `sort-toggle`) are defined in [`../benchmarks/scenarios.ts`](../benchmarks/scenarios.ts); stats/comparison logic in [`../benchmarks/metrics.ts`](../benchmarks/metrics.ts); the committed baseline in [`../benchmarks/baselines/`](../benchmarks/baselines). Each run also writes a timestamped report to `../benchmarks/reports/` (gitignored). Absolute milliseconds are device-noisy, so the harness only compares **relative deltas on the same pinned simulator**. Full details: [`../benchmarks/README.md`](../benchmarks/README.md).

## Visual regression

Pixel-level snapshot checks via `jest-image-snapshot` (wraps `pixelmatch`), wired through [`e2e/setupVisual.ts`](e2e/setupVisual.ts) and called with `expectScreenshotMatches(name)` from [`e2e/helpers/visualSnapshot.ts`](e2e/helpers/visualSnapshot.ts).

```bash
yarn e2e:ios e2e/specs/visualBaseline.spec.ts
```

- Baselines live in [`e2e/__image_snapshots__/ios-iphone17pro-26_2/`](e2e/__image_snapshots__) (device + runtime keyed, committed).
- Take screenshots **only after** `waitForGridState` settles — never diff a mid-animation frame.
- Skia text rasterization is device-dependent, so snapshots are scoped to **geometry-dominated** views (cell/header backgrounds, separators, overlays), use a small percent tolerance, and are iOS-only until Android text metrics are evaluated.

## Continuous integration

GitHub Actions workflows in [`../.github/workflows/`](../.github/workflows):

| Workflow | Trigger | Does |
|---|---|---|
| `pr-smoke.yml` | every PR (required) | typecheck + root jest + example build + `e2e:ios:smoke` |
| `e2e-full.yml` | PR label `e2e:full` | full Detox suite + visual snapshots + benchmarks (posts a delta comment) |
| `nightly.yml` | cron | full suite + benchmark, uploads reports as artifacts |
| `release-gate.yml` | release tag | full suite, must pass |

All jobs pin the Xcode/simulator runtime to match the snapshot/benchmark baseline key.

## Writing new specs

- Use **Detox's `expect`** for element matchers (`expect(element(by.id("foo"))).toBeVisible()`) — it's the global default in Detox 20+.
- Use **`jestExpect` from `@jest/globals`** for value matchers — Detox 20 overrides the global `expect` and rejects non-element arguments. See the import at the top of `e2e/specs/smoke.spec.ts`.
- Compose interactions via `gridDriver` rather than raw `element()` / `by.id()`.
- Read grid state with `waitForGridState(predicate)` instead of fixed sleeps.

## Regenerating the iOS project

`ios/` tracks an RN 0.79.4 community template renamed from `HelloWorld` to `SkiaGridExample`. To recreate it from upstream:

```bash
# 1. Clone the upstream template at the matching tag
git clone --depth 1 --branch 0.79-stable \
  https://github.com/react-native-community/template.git /tmp/rn-template

# 2. Copy ios/ into the example app
cp -R /tmp/rn-template/template/ios example/ios
cp /tmp/rn-template/template/_xcode.env example/ios/.xcode.env

# 3. Rename HelloWorld → SkiaGridExample (paths + contents)
cd example
mv ios/HelloWorld ios/SkiaGridExample
mv ios/HelloWorld.xcodeproj ios/SkiaGridExample.xcodeproj
find ios -depth -name '*HelloWorld*' -execdir bash -c \
  'mv "$1" "${1//HelloWorld/SkiaGridExample}"' _ {} \;
find ios -type f \( -name '*.swift' -o -name '*.plist' -o -name '*.storyboard' \
  -o -name '*.pbxproj' -o -name 'Podfile' -o -name '*.xcprivacy' \
  -o -name '*.xcscheme' -o -name '*.xcworkspacedata' \) -print0 \
  | xargs -0 perl -i -pe 's/HelloWorld/SkiaGridExample/g'

# 4. Pod install
cd ios && pod install
```

## Known caveats

- **Reanimated + Detox idle.** Detox tracks declarative Reanimated animations but not arbitrary persistent `runOnUI` worklet loops — a never-idle UI thread stalls Detox's launch/sync. The UI-thread layer-recording paths are flag-gated (`src/renderer/featureFlags.ts`, default off); gate any persistent loop behind `global.__DETOX__` with a JS fallback.
- **Port 8081.** Metro binds to 8081. Free it (or pass `--port` and rebuild with `RCT_METRO_PORT`) if another RN session holds it.
- **iOS only today.** Only the iOS Simulator is wired for Detox/visual/bench. Android emulator config is sketched in `.detoxrc.js` but `android/` hasn't been regenerated.
- **Visual snapshots are device-keyed.** Run them on the pinned simulator/runtime; a different device or OS will diff on font rasterization, not real regressions.
