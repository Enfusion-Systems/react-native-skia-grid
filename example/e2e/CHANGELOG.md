# E2E Changelog & Coverage Matrix

This file tracks the Detox end-to-end suite for `react-native-skia-grid` and the
**coverage of each grid feature**. Its purpose is to make dev↔e2e gaps visible:
when a feature changes in the library (see the root [`CHANGELOG.md`](../../CHANGELOG.md)),
update the matching story + spec here, and review this matrix to spot anything a
dev change touched that e2e doesn't yet cover.

Format follows [Keep a Changelog](https://keepachangelog.com/). Status legend:
✅ implemented & green · ⏳ tracked gap (see reason) · 🧪 partial.

---

## How the suite works (read before extending)

- The grid renders to **one Skia canvas** (no per-cell native views). Specs
  assert against **`GridReportableState`** (emitted by `onLayoutComplete`,
  surfaced through the hidden `StateBridge` / `grid-state` testID), and drive
  interactions by:
  - tapping **canvas points** relative to `grid-root` (see `helpers/columnGeometry.ts`),
  - tapping **action-sheet buttons** by stable testID (`grid-action-*`) via `gridDriver.action`,
  - tapping **menu text** (`Left`/`Right`/`None`, `(Select all)`) by `by.text`,
  - tapping **example controls** (DataSizeControls, theme/density, API) by testID.
- Each spec **deep-links** to its story with `launchStory(<id>)`
  (`device.launchApp({ launchArgs: { story } })` → `Settings.get('story')`).
- **Observable via the state bridge:** selection, sort, filter (active columns +
  filtered count), pinning, grouping (column set + row count), editing (active
  cell), section widths, column ids/order, row count.
- **NOT observable (⏳ todos):** scroll offset / visible range, per-column width,
  theme/density visuals, custom-render pixels, CSV output, aggregation values.

## Coverage matrix

| Feature | Story | Spec | Scenarios | Status |
|---|---|---|---|---|
| Mount / initial state | `basic` | `smoke.spec.ts` | mounts, column ids, empty selection/edit/filter | ✅ |
| Sorting | `sorting` | `sorting.spec.ts` | asc, desc, clear | ✅ |
| Sorting (multi-column) | `sorting` | `sorting.spec.ts` | long-press chain + sortIndex precedence | ⏳ Detox `longPress` crashes RNGH buttons (UIKit touch registry); no imperative sort API |
| Filtering (set) | `filtering` | `filtering.spec.ts` | apply set filter, clear filter | ✅ |
| Filtering (number/text/date) | `filtering` | `filtering.spec.ts` | ConditionsList input flows | ⏳ text-entry flows not yet automated |
| Filtering (multi-column AND) | `filtering` | `filtering.spec.ts` | combine filters | ⏳ depends on input flows |
| Pinning | `pinning` | `pinning.spec.ts` | pin left, pin right, unpin | ✅ |
| Pinning (scroll isolation) | `pinning` | `scrolling.spec.ts` | pinned stays fixed on h-scroll | ⏳ visual, needs screenshot |
| Selection | `selection` | `selection.spec.ts` | single toggle, multi-select, select-all | ✅ |
| Grouping | `grouping` | `grouping.spec.ts` | group, ungroup | ✅ |
| Grouping (expand/agg) | `grouping` | `grouping.spec.ts` | expand/collapse, aggregation values | ⏳ group-row hit-testing / values are visual |
| Cell editing | `cellEditing` | `cellEditing.spec.ts` | active cell on tap, move cell | ✅ |
| Cell editing (commit) | `cellEditing` | `cellEditing.spec.ts` | commit via editor input | ⏳ text-entry not yet automated |
| Runtime data size | `basic` | `dataSize.spec.ts` | row presets, 10k rows, add/remove columns | ✅ |
| Imperative API | `imperativeApi` | `imperativeApi.spec.ts` | clearRows, setRowsData, applyTransaction, deselectAll | ✅ |
| Slot overrides | `slots` | `slots.spec.ts` | custom slots render + stay interactive | ✅ |
| Theming & density | `themingDensity` | `themingDensity.spec.ts` | toggles don't break grid | ✅ |
| Theming & density (visual) | `themingDensity` | `themingDensity.spec.ts` | light/dark + density snapshots | ⏳ needs screenshot diffing |
| Scrolling | `enterprise` | `scrolling.spec.ts` | v/h scroll on 1k rows, no crash | ✅ |
| Scrolling (visible range) | `enterprise` | `scrolling.spec.ts` | assert visible row/col range | ⏳ scroll offset not in state bridge |
| Resizing | `sorting` | `resizing.spec.ts` | section widths reported | 🧪 structure only |
| Resizing (drag/auto-size/min) | `sorting` | `resizing.spec.ts` | drag handle, auto-size, MIN clamp | ⏳ canvas drag not automatable; per-column width not in bridge |
| Custom renderers | `customRenderers` | `customRenderers.spec.ts` | mounts with custom columns | 🧪 mount only |
| Custom renderers (visual) | `customRenderers` | `customRenderers.spec.ts` | formatter output, redIfNegative | ⏳ visual, needs screenshot |
| Edge cases | `emptyAndEdge` | `edgeCases.spec.ts` | empty / 1 / 100 rows, rapid toggling | ✅ |

## What would close the ⏳ gaps

- **Screenshot diffing** (pixelmatch / jest-image-snapshot): unlocks theming,
  density, custom-render and pinned-scroll visual assertions.
- **Extend `GridReportableState`** with `visibleRowIndexes` / `visibleColIndexes`
  and per-column widths: unlocks scroll-range and precise resize assertions.
- **Detox/RNGH long-press fix** (or an imperative sort API): unlocks multi-sort.
- **Editor text-entry helper**: unlocks filter input flows and edit-commit.

---

## [Unreleased] - 2026-05-29

### Added
- Storybook-like example app: 13 navigable stories (one per feature) with
  on-screen instructions + commented source; `launchArgs.story` deep-linking.
- Runtime row/column controls (`DataSizeControls`) — presets 0/1/100/1k/10k,
  ± steppers, column add/remove.
- Feature-segregated Detox specs (15 files) + helpers (`launchStory`,
  `columnGeometry`, expanded `gridDriver` with `action` testID map / `tapId` /
  `tapText` / `tapLabel` / `tapCell` / `tapHeader` / `openColumnMenu`).
- This coverage matrix.

### Changed (library — minimal, for testability + a11y)
- `DefaultButton` now sets `accessibilityLabel` from its `text` prop and
  `accessibilityRole="button"` — icon-only buttons were previously unlabelled
  (a11y gap) and unreachable by tests.
- `StyleablePressableBase` now forwards `testID` / `accessibilityLabel` /
  `accessibilityRole` / `accessible` to its underlying view.
- `ActionMenu` action buttons carry stable testIDs (`grid-action-sort-asc`,
  `-sort-desc`, `-sort-clear`, `-filter`, `-filter-clear`, `-autosize`, `-pin`,
  `-group`).

### Fixed (library)
- **Theme + density now reach the BottomSheetModal.** `@gorhom/bottom-sheet`
  portals its content outside the grid's providers; the slot bridge
  (`view/slots/context.ts`) only re-provided `GridThemeProvider`, so the sheet's
  `useGridStyles()`/`useTokens()` (which carry theme colours AND density metrics)
  fell back to defaults. The bridge now also re-provides `DensityProvider`
  (inside the bridged theme), via a new `useDensity()` hook on
  `DensityProvider`. Verified: the action sheet reflects light theme + low
  density at runtime.

### Notes
- Smoke remains the per-PR gate; the rest form the nightly/full regression run.
- All deterministic data comes from `seededData.ts` (Mulberry32, seed 42).
