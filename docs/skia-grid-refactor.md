# `react-native-skia-grid` — Performance Refactor & Regression Plan

**Owner:** TBD &nbsp;•&nbsp; **Status:** Draft &nbsp;•&nbsp; **Last updated:** 2026-05-27

---

## 0. Context

The grid package (`.`) is a custom Skia-rendered data grid running on:

- `react-native` **0.79.4**
- `react-native-reanimated` **~3.17.4**
- `@shopify/react-native-skia` **2.0.7**

A code audit surfaced two distinct issues:

1. **Misleading `"worklet"` annotations.** Layer-creator functions and React hooks are tagged `"worklet"` but are invoked from `useEffect` on the JS thread. The directives are dead code today and obscure where work actually runs.
2. **Latency hot-spots in the draw pipeline.** Per-frame `cloneDeep`, per-call `Skia.Path.MakeFromSVGString`, per-section unconditional re-records, `JSON.stringify` deps, and 3ms debouncers add measurable cost during scroll and resize.

The grid migrated out of its previous monorepo (where Detox was not configured and the only e2e infra was Playwright for an unrelated web app). The Detox suite captured in §3 is being built here from scratch.

This plan splits the work into two tracks that progress in parallel:

- **Track A — Performance Refactor** (§2). Quick wins first; architectural lift (UI-thread picture recording) last.
- **Track B — Detox Regression Suite** (§3). Bootstrap a dedicated example app; build coverage in lockstep with each refactor phase so we catch regressions as they land.

---

## 1. Goals & Non-Goals

### Goals

- Eliminate misleading worklet annotations; make thread-of-execution explicit per layer.
- Cut per-frame JS work by ≥ 50% on the existing benchmark dataset (10k rows × 20 cols).
- Hit a sustained 60 FPS scroll on iPhone 12 / Pixel 6 mid-tier devices.
- Land a Detox suite covering the 8 functional pillars (scroll, selection, sort, filter, pinning, resizing, grouping, cell editing) with ≥ 60 deterministic specs.
- Wire CI to run smoke specs on every PR; nightly full suite + visual snapshots.

### Non-Goals

- **No RN / Reanimated / Skia upgrades** as part of this refactor. Nothing in RN 0.80 / 0.81 or Reanimated 4 materially changes the worklet/Skia model for our stack; upgrading is orthogonal and can be sequenced afterward.
- **No new grid features.** Grouping aggregations, virtual columns, server-side row model, etc. are out of scope.
- **No design-system migration.** Theme tokens and density rules are untouched.
- **No public API breakage.** The package is published; refactor is internal-only.

---

## 2. Track A — Performance Refactor

Sequenced in three phases. **Phases 1–2 are cheap, reversible, and unlock measurable wins.** Phase 3 is the architectural lift and only commences after Phases 1–2 are merged and benchmarked.

### Phase 1 — Hygiene & Quick Wins (week 1)

Cheap, isolated, each landable as a standalone PR.

| # | Change | Files / lines | Risk | Validation |
|---|---|---|---|---|
| A1 | **Delete dead `"worklet"` annotations** from React hooks and from layer-creator functions that are only invoked from `useEffect`. Document the threading model in `renderer/README.md`. | `gridLayers.ts:55,92,414`; `layers/useCellBackground.tsx:27`; `layers/useHeaderBackground.tsx:32`; `layers/useSectionSeparator.tsx:28`; `layers/usePictures.tsx:13`; `drawing/drawMethods.ts:558,649,1086`; `drawing/drawingPrimitives.ts:78` | Low | Type-check + existing Jest suite + Detox smoke (after §3 is bootstrapped). |
| A2 | **Cache `Skia.Path.MakeFromSVGString`** results in a global `Map<string, SkPath>`. SVG path strings are immutable, so paths can be reused. | `drawing/drawingPrimitives.ts:85` (`drawSvgPath`) | Low | Visual snapshot test (`headerContent.spec.ts`) confirms icons render unchanged. Add micro-benchmark in `__tests__/drawingPrimitives.bench.ts`. |
| A3 | **Replace `cloneDeep(columns)` with shallow-spread index updates.** Columns carry function refs (`cellRenderer`, `valueGetter`) that don't need cloning. | `GridCanvas.tsx:327`, `GridCanvas.tsx:1012` | Low–Med | Resize + section-resize Detox specs. |
| A4 | **Remove `debounce(..., 3)` on resize handlers.** 3ms buys nothing and adds a timer queue per gesture frame. | `GridCanvas.tsx:775`, `GridCanvas.tsx:784` | Low | Resize Detox spec. Confirm no regression in gesture handler stress test. |
| A5 | **Replace `JSON.stringify(sortStatus)` dep with `useDeepEqChange`.** The hook already exists at `internal/hooks.ts`. | `GridCanvas.tsx:410` | Low | Sort Detox spec, particularly multi-column sort sequencing. |
| A6 | **Hoist `computeColumnGroupHeaders` / `buildColGroupDepthMap`** out of the per-section loop in `useHeaderBackground`. Memoize on `[columns[status], columnGroupPaths]`. | `layers/useHeaderBackground.tsx:53-60` | Low | Header content snapshot (grouped + ungrouped). |

**Exit criteria for Phase 1:** All PRs merged; Detox smoke suite (§3.4.1) green; baseline benchmark recorded.

### Phase 2 — Targeted Optimizations (week 2–3)

Higher-effort, still scoped per-layer. Each unblocks part of Phase 3.

| # | Change | Files / lines | Risk | Validation |
|---|---|---|---|---|
| B1 | **Pool fill paints** behind `getCachedFillPaint(ctx, color, blendMode)`. Invalidate on theme change. Avoids `paint.copy()` per shape. | `drawing/drawingPrimitives.ts:55`; new `drawing/paintCache.ts` | Med | Unit test for cache invalidation; visual snapshot for theme switch. |
| B2 | **Hoist `Skia.Color()` parsing out of `drawCellBackground`'s per-row loop.** Negligible per row, dominant at scale. | `drawing/drawMethods.ts:670-694` | Low | Bench-only — no functional change. |
| B3 | **Gate per-section re-records.** In `useCellBackground` / `useHeaderBackground` / `useCellContent` the section loop re-records `left + center + right` unconditionally. Track previous inputs per section; only re-record sections whose inputs changed. | `layers/useCellBackground.tsx:42-57`, `layers/useHeaderBackground.tsx:51-76`, `layers/useCellContent.tsx:160-213` | Med | Pinning Detox spec — confirm pinned columns don't redraw on center-only scroll (via state-reporting hook §3.3). |
| B4 | **Fast-path the paragraph cache key** for the common `{}` text/para style case — skip the two `JSON.stringify` calls. | `drawing/drawMethods.ts:228` | Low | Existing paragraph cache test extended. |
| B5 | **Stabilize `xVal` referential identity** in dep arrays. Use `useMemo` so the Record reference only changes when one of its values actually changes. | `GridCanvas.tsx` (`xVal` from `useDerivedXVal`) | Low | Render-count test via React DevTools profiler hook. |
| B6 | **Investigate `PictureRecorder` pooling.** Spike: measure allocation cost vs reuse overhead. Implement if ≥ 5% win on scroll bench, else document and skip. | `renderer/gridLayers.ts:45` (`recordPicture`) | Low (spike) | Bench result + ADR. |

**Exit criteria for Phase 2:** Benchmark shows ≥ 30% reduction in JS-thread time per scroll-frame. State-reporting hook (§3.3) lands as part of B3 since it's required for the gating test.

### Phase 3 — Two-Lane Pipeline (week 4–6)

The architectural lift. **Do not start until Phase 1–2 are merged and benchmarks confirm the cheap wins.** This is the most disruptive change and the only one that requires moving code across threads.

#### Target architecture

```
┌─ FAST LANE (UI thread, useDerivedValue worklets) ────────┐
│  • cellBackground          (scroll-driven, geometric)    │
│  • cellOverlay             (selection geometry)          │
│  • headerOverlay           (column resize)               │
│  • sectionOverlay          (section resize)              │
│  • sectionSeparator        (static + scroll-clipped)     │
│  Inputs: xVal[*].value, y.value, layout.value            │
└──────────────────────────────────────────────────────────┘
┌─ SLOW LANE (JS thread, useEffect) ───────────────────────┐
│  • headerContent           (sort/filter/columns)         │
│  • cellContent             (rows, selection, edit state) │
│  • derived column metadata (groupDepth, geometry)        │
│  Triggered by React state changes; no per-frame latency  │
└──────────────────────────────────────────────────────────┘
```

#### Sequenced migration

| # | Change | Risk | Notes |
|---|---|---|---|
| C1 | **Promote `createSectionSeparatorLayer` to UI-thread `useDerivedValue`.** Lowest-risk pilot: pure geometry, no React state. | Low | Validates the worklet picture-recording pattern end-to-end. |
| C2 | **Promote `createCellBackgroundLayer`.** Purely geometric; depends only on theme, dimensions, row count. | Med | Theme is captured at worklet creation; row count comes via shared value. |
| C3 | **Promote overlay layers** (`createOverlayLayer`, `createHeaderOverlayLayer`, `createSectionOverlayLayer`). These already have animation-driven inputs (`yPos`, `headerOverlayColumnWidth`). | Med | Existing `useAnimatedReaction` patterns guide the migration. |
| C4 | **Remove the `lastBridge` threshold** in `useCellContent` once content recording can also live on UI thread, OR keep it if `cellContent` stays on JS (decision via benchmark). | Med-High | If kept on JS, document the rationale; the threshold is justified. |
| C5 | **Decide paragraph cache strategy.** Options: (a) keep JS-side, accept duplicate work on UI thread; (b) migrate to a worklet-shared `SharedValue<Map>` (requires Reanimated 3.16+ `createWorkletRuntime`); (c) precompute paragraphs eagerly on JS thread, ship over via shared value. Recommendation: spike (a) and (c), bench, choose. | High | Largest unknown. May extend Phase 3 timeline. |

#### Exit criteria for Phase 3

- 60 FPS sustained scroll on iPhone 12 / Pixel 6 with the 10k-row benchmark.
- JS-thread frame time during scroll < 4ms (was ~10–14ms baseline).
- All Detox specs green.
- No new flakiness in Detox sync (worklet-runtime loops, if any, gated behind `__DETOX__`).

### Phase ordering rationale

Phases 1 & 2 deliver real wins **without touching the threading model**, so they de-risk Phase 3 and provide a safety margin if Phase 3 has to be deferred or scoped down. Phase 3 is the only step where rollback complexity rises sharply — gate it behind the regression suite.

---

## 3. Track B — Detox Regression Suite

### 3.1 Scoping decisions

- **Host app:** dedicated example app at `example/` — kept separate from any consumer production app. A minimal host gives us deterministic startup and isolated CI.
- **Detox version:** pin to **20.51.x** (latest stable as of plan date). Supports RN 0.77–0.84 with full New Arch compatibility.
- **Tool choice:** Detox over Maestro / Appium. Detox is the default for RN library authors in 2026 — gray-box, JS-thread sync, Reanimated iOS sync (PR #4040). Maestro is black-box and doesn't introspect shared values; not suitable for a Skia/worklet-heavy library.
- **Library consumption:** the example consumes `react-native-skia-grid` via a babel module-resolver alias to `../src`, with Metro watching `..` so live source edits hot-reload. No `yarn build` needed during development.

### 3.2 Example app bootstrap

```
example/
  .detoxrc.js
  babel.config.js                # alias react-native-skia-grid → ../src
  metro.config.js                # watchFolders: ['..']
  index.js
  App.tsx                        # SafeAreaProvider + scene picker (see 3.5)
  ios/
  android/
  e2e/
    jest.config.js
    globalSetup.ts
    globalTeardown.ts
    helpers/
      gridDriver.ts              # gridDriver.scrollToRow(n), selectCell(r,c)
      stateBridge.ts             # Reads <View testID="grid-state" /> JSON
      testData.ts                # Seeded deterministic datasets
    specs/
      smoke.spec.ts              # Runs on every PR
      scroll.spec.ts
      selection.spec.ts
      sort.spec.ts
      filter.spec.ts
        pinning.spec.ts
        resizing.spec.ts
        grouping.spec.ts
        cellEditing.spec.ts
        themeAndDensity.spec.ts    # Visual-snapshot only
```

### 3.3 The testability bridge (critical)

Skia draws to a single Canvas. Standard `by.id('cell-0-1')` finds nothing because cells aren't native views. **We adopt a layered approach:**

1. **Gesture targets via thin native wrappers.** Wrap the `Canvas` in `<View testID="grid-root">`. Place transparent `<Pressable testID="grid-hitlayer">` overlays for header strip, column-action trigger, and the scroll surface. Detox interacts with these; Skia paints on top.

2. **Action-result reporting (primary pattern).** Add a new prop to the grid:

   ```ts
   onLayoutComplete?: (state: GridReportableState) => void;
   ```

   `GridReportableState` is computed at the end of each redraw cycle and includes:
   - `visibleRowIndexes: [start, end]`
   - `visibleColIndexes: Record<ColumnSection, [start, end]>`
   - `selectedCells: Array<{ rowId; colId }>`
   - `sortStatus`, `filterKeys`, `expandedGroupIds`
   - `columnWidths`, `sectionWidths`, `scrollOffsets`
   - `editingCell?: { rowId; colId }`

   The example app renders this into `<View testID="grid-state" accessibilityLabel={JSON.stringify(state)} />`. Tests read via `await element(by.id('grid-state')).getAttributes()` and parse the JSON. **No native introspection of Skia required.**

   This pattern is what Shopify's internal perf grids use; FlashList does something analogous for its `onLoad` / `onViewableItemsChanged` hooks.

3. **Visual regression as secondary gate.** `device.takeScreenshot('grid-after-sort')` plus a post-step `pixelmatch` or `jest-image-snapshot` diff. Use sparingly — Skia text rasterization is device-dependent, so per-cell pixel assertions are flaky. Reserve for `themeAndDensity.spec.ts` and a handful of structural snapshots.

4. **Reanimated sync gotcha.** Detox tracks declarative Reanimated animations (PR #4040) but **does not introspect arbitrary `runOnUI` worklets**. Long-running worklet loops will stall idle detection. Mitigation: wrap any persistent UI-thread loop in `if (!global.__DETOX__)`, or `device.disableSynchronization()` for the specific spec and use explicit `waitFor(...).withTimeout(...)`.

### 3.4 Spec coverage matrix

Each row maps to one spec file. Target ~6–10 tests per file (~60–80 total). Specs use `gridDriver` helpers, never raw `element()` calls — keeps tests declarative and refactor-tolerant.

#### 3.4.1 `smoke.spec.ts` (runs on every PR)

- Renders without crash with empty dataset.
- Renders with 10 rows, 5 cols.
- Vertical scroll to last row works.
- Horizontal scroll to last column works.
- Tap on a cell selects it (single-selection mode).
- `onLayoutComplete` fires within 500ms of mount.

#### 3.4.2 `scroll.spec.ts`

- Vertical scroll updates `visibleRowIndexes`.
- Horizontal scroll updates `visibleColIndexes.center`.
- Pinned-left columns do NOT scroll horizontally with center.
- Pinned-right columns do NOT scroll horizontally with center.
- Momentum-fling settles within bounds (verifies `applyScrollDecay`).
- Over-scroll clamps at top / bottom / left / right edges.
- Scroll-to-row API jumps to exact offset.
- Rapid scroll alternation doesn't lose frames (sample `onLayoutComplete` count vs gesture count).
- Buffer rows (`rowBuffer`) are honored — content drawn beyond visible range.

#### 3.4.3 `selection.spec.ts`

- Single mode: tapping a row selects it; tapping again deselects (or doesn't, depending on prop).
- Single mode: tapping a different row replaces selection.
- Multiple mode: header checkbox selects all visible.
- Multiple mode: header checkbox toggles to partial when subset selected.
- Multiple mode: row tap toggles individual.
- Group node selection cascades to children.
- Selection persists across scroll (state-reporting confirms `selectedCells`).
- Programmatic `setSelectedRow(null)` clears.

#### 3.4.4 `sort.spec.ts`

- Tap column header → single-column ascending.
- Tap again → descending.
- Tap again → unsorted.
- Multi-column: shift-tap (or modifier) builds sort chain.
- Multi-sort index badge renders (visual snapshot).
- `onSortChange` callback fires with correct payload.
- Sorting a pinned column doesn't shift its position.

#### 3.4.5 `filter.spec.ts`

- Open filter menu via column action.
- Text filter: enter substring, grid filters rows.
- Set filter: check/uncheck values.
- Condition filter: select operator + value.
- Filter icon appears on filtered column.
- Clear filter restores all rows.
- Multi-column filters compose (AND semantics).

#### 3.4.6 `pinning.spec.ts`

- Pin a column left via column action menu.
- Pin a column right.
- Unpin returns column to natural position.
- Horizontal scroll in center doesn't move pinned columns (regression for Phase 2 B3).
- Section resize handle drags left section wider.
- Section resize respects `MIN_COLUMN_SIZE`.

#### 3.4.7 `resizing.spec.ts`

- Drag column resize handle widens the column.
- Drag below `MIN_COLUMN_SIZE` clamps.
- Resize the rightmost right-pinned column scrolls the grid (verifies `isRightPinnedLastColumnResizing` branch).
- Auto-size column menu action fits to content.
- Column widths persist across re-render (via `setColumns` callback).

#### 3.4.8 `grouping.spec.ts`

- Drag column to grouping panel (or programmatic API).
- Group node renders with expand/collapse icon.
- Tap expand reveals children.
- Tap collapse hides children.
- Multi-level grouping (group by 2 columns).
- Aggregations render correctly in group rows (if supported).
- Selection at group level cascades.

#### 3.4.9 `cellEditing.spec.ts`

- Tap editable cell opens `CellEditingModal`.
- Tap non-editable cell shows tooltip if `tooltipValueGetter` returns value.
- Tap non-editable cell with no tooltip does nothing.
- Commit value via modal updates underlying data + fires `onCellEditingStopped`.
- Cancel via modal preserves original value.
- Editing one cell while another is selected switches the editor.

#### 3.4.10 `themeAndDensity.spec.ts` (visual)

- Light theme renders correctly (snapshot).
- Dark theme renders correctly (snapshot).
- High / medium / low density variants render correctly (3 snapshots).
- Font-size override propagates (visual + state-bridge `cellFontSize`).

### 3.5 Test scenes in the example app

The example app's `App.tsx` exposes a route picker (Detox sets `--scene` on launch via `launchArgs`) for four canonical configurations:

1. **`basic`** — 100 rows × 10 cols, no pinning / grouping.
2. **`enterprise`** — 10 000 rows × 20 cols, mixed pinned-left/right, sorting + filtering enabled.
3. **`grouped`** — 1000 rows × 8 cols with 2-level grouping and aggregations.
4. **`editable`** — 50 rows × 6 cols with editable cells and validation rules.

Each scene seeds deterministic data (seed-based, not random) so visual snapshots are stable.

### 3.6 CI integration

| Stage | Trigger | Specs |
|---|---|---|
| **PR check (required)** | Every PR | `smoke.spec.ts` only. iOS Simulator. ~3 min wall time. |
| **PR check (optional)** | Label `e2e:full` | Full suite, iOS. ~25 min. |
| **Nightly** | Cron 02:00 UTC | Full suite on iOS + Android emulators. Visual snapshots updated weekly via separate workflow. |
| **Release gate** | Tag matching `react-native-skia-grid@*` | Full suite, both platforms, must pass. |

### 3.7 Sequencing with Track A

Detox work runs in parallel to refactor PRs:

| Week | Track A | Track B |
|---|---|---|
| 1 | Phase 1 PRs (A1–A6) | Example app scaffold + smoke spec. State-bridge prop merged into the package. |
| 2 | Phase 2 starts (B1, B2, B4, B5) | `scroll.spec.ts`, `selection.spec.ts`, `sort.spec.ts`. |
| 3 | Phase 2 finishes (B3, B6 spike) | `filter.spec.ts`, `pinning.spec.ts`, `resizing.spec.ts`. |
| 4 | Phase 3 starts (C1, C2) | `grouping.spec.ts`, `cellEditing.spec.ts`, visual snapshots. |
| 5 | Phase 3 mid (C3) | CI wiring, flake review, helper hardening. |
| 6 | Phase 3 finishes (C4, C5 decision) | Final regression sweep + release. |

### 3.8 Risks & mitigations

| Risk | Mitigation |
|---|---|
| Reanimated worklet sync stalls Detox idle detection. | Gate any persistent UI-thread loops behind `global.__DETOX__`. Audit during C1–C5. |
| Skia text rasterization differs by device → visual flakes. | Limit visual snapshots to `themeAndDensity.spec.ts`. Pin simulator versions in CI. |
| iOS release-build module resolution fails on packaged deps. | Keep `detox`, `jest`, `metro` as direct deps of `example/` so they resolve from `example/node_modules`. |
| State-bridge JSON grows large → `accessibilityLabel` truncation. | Cap payload at ~4kb; split into multiple `testID`'d views if needed (`grid-state-rows`, `grid-state-cols`). |
| Phase 3 architectural change extends timeline. | Phases 1 & 2 are independently shippable wins, so we can pause before Phase 3 without blocking. |

---

## 4. Measurement & Acceptance

### 4.1 Benchmarks (recorded in `benchmarks/`)

- **B-Scroll-10k:** Sustained vertical scroll across 10 000 rows × 20 cols on iPhone 12 + Pixel 6.
- **B-Resize:** Drag column resize for 5 seconds; measure JS frame time.
- **B-Sort-Toggle:** Toggle sort on a 1 000-row dataset; measure time to first stable frame.
- **B-Filter-Apply:** Apply a filter that shrinks to 10% of rows; measure redraw time.

### 4.2 Acceptance criteria

| Metric | Baseline (TBD on Phase 1 start) | Phase 2 target | Phase 3 target |
|---|---|---|---|
| B-Scroll-10k median JS frame time | TBD | −30% | < 4 ms |
| B-Scroll-10k 95th-percentile JS frame time | TBD | −30% | < 8 ms |
| B-Resize JS frame time | TBD | −20% | unchanged |
| B-Sort-Toggle time-to-stable | TBD | −15% | unchanged |
| Detox suite green | n/a | smoke + Phase-1 specs | full suite |
| Detox flake rate (re-run pass rate) | n/a | ≥ 95% | ≥ 98% |

Baselines are captured in the first Phase-1 PR alongside the benchmark harness.

---

## 5. Open questions

1. **Paragraph cache strategy (C5).** Spike required before committing.
2. **State-bridge granularity.** Does serializing full `selectedCells` on every redraw create GC pressure? Bench during smoke spec.
3. **Android visual snapshots.** Are Android Skia text metrics stable enough for snapshot tests, or restrict to iOS? Decide before Phase 3.
4. **Public API for `onLayoutComplete`.** Is this a permanent public prop, or test-only (gated by `__DEV__ || __DETOX__`)? Default position: permanent + documented, since consumers may also benefit.
5. **CI simulator pinning.** Which iOS / Android versions to lock in? Coordinate with mobile platform team.

---

## 6. Out-of-scope follow-ups

Tracked for future quarters, not part of this plan:

- **RN 0.81 / 0.82 upgrade** once 0.82 ships stable. Reanimated 4 evaluation at that point.
- **Server-side row model** for grids backed by paginated APIs.
- **WebGPU experiment** for desktop targets — Skia's WebGPU backend is maturing; worth a spike in H2.
- **Storybook-style demo** in `apps/storybook` once example-app patterns stabilize.

---

## Appendix A — File reference index

Hot files touched by this plan (with the change index they're affected by):

- `src/renderer/gridLayers.ts` — A1, A2, B6
- `src/renderer/drawing/drawingPrimitives.ts` — A1, A2, B1, B2, B4
- `src/renderer/drawing/drawMethods.ts` — A1, B2, B4
- `src/renderer/GridCanvas.tsx` — A3, A4, A5, B5, state-bridge
- `src/renderer/layers/useCellBackground.tsx` — A1, B3, C2
- `src/renderer/layers/useHeaderBackground.tsx` — A1, A6, B3
- `src/renderer/layers/useCellContent.tsx` — B3, C4
- `src/renderer/layers/useSectionSeparator.tsx` — A1, C1
- `src/renderer/layers/usePictures.tsx` — A1

## Appendix B — References

- Reanimated worklets: https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/
- Reanimated Babel plugin: https://docs.swmansion.com/react-native-worklets/docs/worklets-babel-plugin/about/
- Skia Pictures: https://shopify.github.io/react-native-skia/docs/shapes/pictures/
- Skia Animations: https://shopify.github.io/react-native-skia/docs/animations/animations/
- Detox releases: https://github.com/wix/Detox/releases
- Detox sync troubleshooting: https://wix.github.io/Detox/docs/troubleshooting/synchronization
- Detox Reanimated iOS sync (PR #4040): https://github.com/wix/Detox/pull/4040
