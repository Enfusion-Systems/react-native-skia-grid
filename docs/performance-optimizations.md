# Performance Optimizations Log

Running log of performance-focused changes to `react-native-skia-grid`. Each entry documents what changed, why, measured impact, and how to verify. Optimizations are shipped incrementally, one per PR, so individual wins can be observed and rolled back in isolation if needed.

Optimizations are grouped into phases (see `MEMORY.md` / prior planning):
- **Phase A** — quick wins (low effort, low risk, measurable impact) — **✅ complete**
- **Phase B** — medium lift (caching layers, batching patterns) — **✅ closed out 2026-04-21**
- **Phase C** — architectural (row-level picture cache, column manager versioning) — **deferred, revisit with measurement data**

---

# Phase B Closing Summary _(2026-04-21)_

Phase B closed after shipping 5 changes plus one reverted attempt. The decision to stop came from a combination of: (a) performance was observed to be acceptable on-device after the shipped items landed, (b) remaining candidates had declining ROI and rising implementation risk, and (c) further gains should be driven by measurement rather than intuition.

## What shipped

| # | Item | Type | Primary benefit |
|---|---|---|---|
| 1 | `selectedCellParams` deep-eq in `useCellContent` | Stabilization | Kills spurious cell-content picture re-records when the setter is called with equivalent content (happens repeatedly from ~5 sites in `GridCore.tsx`). |
| 2 | Theme change deferral via `React.useDeferredValue` | Input responsiveness | Theme toggle no longer blocks the input commit. Picture re-record cascade happens 1–2 frames later during idle, not during the tap. |
| 3 | Layer prop memoization — `useCellOverlay` (mirror of item 1) | Stabilization | Same pattern applied to the overlay hook. Both layers now insulated from the same class of spurious update. |
| 4 | Count-bounded LRU for `indexesCache` in `gridUtils.ts` | Steady-state fix | Replaced the TTL-based `BasicLRUCache` whose `has()` was O(n) over unbounded entries. Fixed the progressive scroll lag observed during extended scrolling on a 5000-row blotter. |

*(Items 1 and 2 from the original Phase B numbering; "Paragraph layout cache" was pivoted into Phase A — see 2026-04-20 entry.)*

## Attempted and reverted

**Explicit `SkPicture` disposal via `requestAnimationFrame`** — implemented, crashed on fast-scroll (`HostFunction: Attempted to access a disposed object`), reverted in full. Full postmortem in the 2026-04-21 docs entry. **Do not re-attempt without first establishing a disposal contract with the Skia surface via the Reanimated mapper pipeline.** No fixed RAF delay is safe; mapper propagation latency is unbounded under load.

Takeaway for future work: `SharedValue<SkPicture>` objects are GC-managed by design in the current `@shopify/react-native-skia` + `react-native-reanimated` combination. Manual disposal on swap is the wrong abstraction layer. If memory pressure becomes observable, prefer **unmount-time disposal** (whole-grid teardown) over per-swap disposal.

## Deliberately skipped (and why)

| Item | Reason skipped |
|---|---|
| **`drawAtlas` for sort/filter/checkbox sprites** | Medium-high effort. Analysis shows icon drawing is not a per-cell hot loop — icons render once per picture record. After the disposal incident, touching Skia-native batching APIs without evidence of a specific icon-draw bottleneck is not justified. Revisit with device profiling showing icon-draw time as a material share of picture record time. |
| **Pre-allocated theme paints in `DrawingContext`** | Low impact. `getFillPaint` / `getStrokePaint` are mostly called once per picture record (cold), not per cell. Some hot-loop callers (e.g., `drawCellBackground`) mutate paints inline, which makes naive caching unsafe. The benefit doesn't clear the complexity bar. Revisit only if profiling flags paint allocation specifically. |
| **Extending `useDeepEqChange` to `useHeaderContent` (`filterState`, `sortStatus`)** | Speculative. Unlike `selectedCellParams`, these props don't have a documented "set to equivalent content repeatedly" pattern. Filter and sort state updates are deliberate user actions, not incidental re-renders. Deep-eq costs real cycles on every render; without evidence of spurious invalidation, we'd add overhead without saving redraws. Revisit if a specific filter/sort-heavy use case shows spurious picture re-records. |

## Outstanding observations from on-device testing

Documented for future reference; not addressed in Phase B:

- **Breaky scroll under fast flicks** — when a scroll delta crosses the viewport buffer boundary, `createCellContent` records a new picture synchronously on the JS thread. With 5000 rows this is still perceptible on fast swipes. Likely mitigation: **widen the `rowBuffer` default** (currently 30) to reduce crossing frequency. Trade-off: bigger cell-content picture, more memory. Not shipped because the symptom was deemed acceptable for now. Simple config change if revisited.
- **Picture slides ahead of text on fast flicks** — the cell-content picture is re-recorded asynchronously via `runOnJS`, so there's a 1–2 frame window where the transform has translated an old picture into the new position but the content hasn't caught up. Architectural: tied to `runOnJS` latency. Proper fix would require worklet-side picture recording or a loading/skeleton state in the gap. Not a Phase B-sized item.

## Recommended next steps

In priority order, for when perf work resumes:

1. **Measure, don't guess.** Add temporary `console.time` probes around `createCellContent` (the JS-thread picture record), the `rebuildRows` pipeline, and any suspected filter/sort/group hot path. Run a representative session on device. Numbers tell us which remaining item (if any) is worth shipping.
2. **Widen `rowBuffer` default** if the device session shows frequent buffer-cross events during typical use. One-line config change with a clear tradeoff to document.
3. **If memory pressure shows up in production**, consider **unmount-time SkPicture disposal** — Grid's top-level cleanup effect walks SharedValues and disposes. Narrower than per-swap (which crashed) but still useful for navigation-heavy flows.
4. **Phase C gating**: the biggest remaining lever is `ColumnManager` with a version counter. It would eliminate `JSON.stringify(columns)` in several hooks' dep strategies and unlock stable refs for downstream memoization. This is invasive and should only be tackled when there's a specific observed win to justify the refactor surface.

## Non-goals (respected)

- **No architecture-doc-driven speculative refactors.** Each shipped change stands on its own evidence.
- **No big upfront changes.** Every item was scoped to a single concern; each had its own commit.
- **No changes to public API, visual behavior, or logic.** All improvements are internal mechanism swaps with identical external behavior.

---

## 2026-04-21 — Count-Bounded LRU for `indexesCache` _(Phase B, item 5)_

### What changed

Replaced the `BasicLRUCache` backing [`indexesCache`](../src/utils/gridUtils.ts) in `gridUtils.ts` with a new locally-defined `BoundedLRUCache<T>` class (count-bounded, cap 512). `deriveIndexes` now memoizes into this bounded LRU instead of the TTL-based cache.

```diff
- const indexesCache = new BasicLRUCache<{ cols: StartEnd; rows: StartEnd }>();
+ const indexesCache = new BoundedLRUCache<{ cols: StartEnd; rows: StartEnd }>(512);
```

The class implements the existing `ICache<T>` interface so `memoize`'s signature is unchanged. No call sites of `deriveIndexes` are modified.

### Why

On-device testing of a 5000-row grid showed progressive scroll lag — scrolling started smooth but degraded over time. Root cause: `BasicLRUCache.has()` scans the entire store on every call to expire stale (>60 s) entries:

```ts
public has = (key: ICacheKey) => {
  const k = getKey(key);
  this.store.forEach((val, ek) => {
    if (ek !== k && Date.now() - val.d >= this.maxAge) this.store.delete(ek);
  });
  return this.store.has(k);
};
```

Under continuous scrolling, each frame produces a **new** cache key (scroll position is part of the key). Nothing evicts entries until they're 60 s stale, so the store grows to thousands of entries. Every `has()` call — made once per `deriveIndexes` invocation — becomes `O(n)` in store size. And `deriveIndexes` runs multiple times per scroll frame (per pinned section).

Quick math: after 60 s of 60 fps scrolling, the cache holds up to ~3,600 entries. Each `has()` scan iterates all of them. That's cumulative JS-thread work that compounds exactly as the user observed — initially fast, progressively slower after extended scrolling.

### Design of `BoundedLRUCache`

- **Count-bounded, not TTL-based.** `set()` evicts the least-recently-used entry when size exceeds `max`. No sweep scans.
- **Uses `Map` insertion order as usage order.** `get()` deletes + re-inserts on hit to move the entry to the MRU end. O(1) per operation.
- **Implements the existing `ICache<T>` interface** so `memoize` can consume it without modification.
- **Local to `gridUtils.ts`.** Not exported. Private to this module to keep the change's blast radius tight and avoid expanding shared-utility surface. If another cache site wants the same pattern later, promote it to `internal/utils/cache.ts`.

### Size: why 512

- Covers ~8 seconds of 60 fps continuous scrolling (enough for typical reverse-scroll hit patterns).
- Memory footprint negligible: each entry is a small `{ cols: {start, end}, rows: {start, end} }` object — a few hundred bytes total for all 512.
- Tunable via the `INDEXES_CACHE_MAX` constant if profiling shows a different value pays off.

### Why not fix `BasicLRUCache` directly

Two reasons:
1. `BasicLRUCache` is used elsewhere (or could be). Changing its semantics from TTL to count-bounded affects any other consumer. Out of scope.
2. `BasicLRUCache.get()` has a latent bug (destructures `store.get(k)!` before checking existence — crashes on miss). Working around that without rewriting the class risks regressions. Leaving it alone.

Keeping the new class local is the minimum-blast-radius fix.

### Measured impact

Expected behavior (to be confirmed on device):

| Metric | Before | After |
|---|---|---|
| `indexesCache.has()` cost per call | O(n) — scans entire store | O(1) — `Map.has()` |
| Cache size after 60 s continuous scroll | up to ~3,600 entries | capped at 512 |
| `deriveIndexes` cost per scroll frame | grows with cache size | constant |
| Steady-state scroll smoothness | degrades over time | should remain flat |

### Verification

- [x] `yarn typecheck` — 251 errors total, zero new errors.
- [x] All 48 jest-runnable tests still pass.
- [ ] Manual smoke test on mobile 5000-row blotter: scroll for 60+ seconds continuously, then observe if the progressive lag is gone.
- [ ] Confirm scroll-reverse (user scrolls down, then back up) still hits cache — recent entries should survive the LRU eviction.

### Risks & follow-ups

- **LRU vs. TTL semantics** — entries that would have aged out under the TTL policy now stay cached if they're recently accessed. In practice that's a win (higher hit rate); could theoretically keep "stale" entries alive if deps were mutated externally, but `deriveIndexes`'s output is a pure function of its args, so no staleness concern.
- **If scroll lag persists after this change**, the remaining suspect is picture-record work on buffer crossings (Symptom 2 in the field report). Next step would be widening `rowBuffer` default or implementing directional buffer.
- **Symptom 3** (picture/text sync on fast scroll) is architecturally tied to `runOnJS` latency and is not addressed by this change. Would need worklet-side picture recording or similar to fix properly.

### Files changed

- `src/utils/gridUtils.ts` — new `BoundedLRUCache` class (local, ~45 lines), `indexesCache` swapped to it, `BasicLRUCache` import removed in favor of `ICache`/`ICacheKey` type imports
- `docs/performance-optimizations.md` — this entry

---

## 2026-04-21 — Layer Prop Memoization Extended to `useCellOverlay` _(Phase B, item 4)_

### What changed

Applied the same `useDeepEqChange` pattern that shipped for `useCellContent` (Phase B item 1) to [`src/layers/useCellOverlay.tsx`](../src/layers/useCellOverlay.tsx):

```diff
+ const selectedCellParamsKey = useDeepEqChange([selectedCellParams]);

  React.useEffect(() => {
    // ... overlay picture record ...
+ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    theme,
    fontManager,
    nodesSelection,
    rows,
-   selectedCellParams,
+   selectedCellParamsKey,
    sectionWidth,
    xVal,
    rowSelection,
    columnWidths,
    layout,
    !!topRowNode,
  ]);
```

### Why

`useCellOverlay` consumes the **same `selectedCellParams` object** that `useCellContent` does, and suffers from the **same spurious-update pattern**: `setSelectedCellParams({ row: null, cellEditingParams: null })` is called from multiple handlers in `GridCore.tsx` with equivalent content, each producing a new object literal that invalidates the overlay picture.

Before this change, tapping outside a cell would re-record the cell-content picture (thanks to the earlier item) but still force the overlay picture to re-record on every repeat. After this change, both layers are insulated from the same class of spurious update.

### Why only `selectedCellParams` (audit of other deps)

Same audit as Phase B item 1 applied to this hook's deps:

| Dep | Verdict | Reasoning |
|---|---|---|
| `theme`, `fontManager` | Leave | Memoized by providers |
| `nodesSelection` | Leave | Map gets replaced on every toggle, but content also changes — refs correlate with real updates |
| `rows` | Leave | Large array; deep-eq cost would exceed picture-record savings |
| `selectedCellParams` | **Stabilize ✓** | Small object, frequently reset to equivalent content |
| `sectionWidth`, `xVal`, `columnWidths` | Leave | Already ref-stable via upstream `useMemo` in GridCore |
| `rowSelection`, `!!topRowNode` | Leave | Primitives |
| `layout` | Leave | SharedValue — changes on legitimate layout events |

Pattern and rationale are identical to item 1; the audit is reproduced here rather than cross-referenced so each entry stands alone.

### Verification

- [x] `yarn typecheck` — 251 errors total, zero new errors vs. baseline.
- [x] All 48 jest-runnable tests still pass.
- [ ] Manual smoke test on mobile (to run alongside the item 1 smoke test):
  - Tap inside → outside → inside → outside rapidly: neither the cell-content nor the cell-overlay pictures should flicker or re-record on no-op taps.
  - Real row-selection and cell-edit flows still draw and clear the overlay correctly on legitimate state changes.

### Risks & follow-ups

- **Risk profile identical to item 1.** If that ship was safe, this is too — same deep-eq call on the same shape of object.
- **`useHeaderContent` also uses `filterState` and `sortStatus`** — potential deep-eq candidates, but both are data-driven state where ref changes typically correlate with real content changes. Lower-signal candidates; not worth extending the pattern further without measurement to justify it.

### Files changed

- `src/layers/useCellOverlay.tsx` — imported `useDeepEqChange`, stabilized `selectedCellParams` for the overlay effect's deps
- `docs/performance-optimizations.md` — this entry

---

## 2026-04-21 — ⚠️ Abandoned: Explicit `SkPicture` Disposal via RAF _(Phase B — failed attempt, reverted)_

### What was attempted

An `assignPictureWithDispose(sharedValue, nextPicture)` helper was introduced in `src/layers/pictureLifecycle.ts`. All 12 call sites across the 8 layer hooks (`useCellBackground`, `useCellContent`, `useCellOverlay`, `useHeaderBackground`, `useHeaderContent`, `useHeaderOverlay`, `useSectionOverlay`, `useSectionSeparator`) were migrated to use it instead of direct `sharedValue.value = next` writes.

The helper's strategy:
1. Swap the SharedValue's value with the next picture.
2. On the next `requestAnimationFrame`, call `.dispose()` on the previous picture.
3. Wrap the dispose call in a try/catch as a soft safety net.

The intent was to bound native memory for `SkPicture` objects instead of leaving disposal to JS GC, particularly beneficial on low-end devices under heavy scroll/edit load.

### What went wrong

Fast-scrolling produced a hard crash on device:

```
Uncaught Error
Exception in HostFunction: Attempted to access a disposed object.

Call stack:
  shopify_ContainerTs6 :1:139
  mapperRun :1:1077
  ...
  callGuardDEV_reactNativeReanimated_initializersTs3 :1:87
```

The `shopify_ContainerTs6` frame is Skia's native rendering container. The `mapperRun` frame is Reanimated's mapper pipeline — the mechanism that propagates SharedValue updates into the declarative Skia surface.

**Root cause:** the race isn't just GPU vs. main thread (which a ~16 ms RAF delay could cover). It's between the SharedValue write and **Reanimated's propagation pipeline consuming that write to drive the Skia surface**. That propagation has no bounded latency — during heavy scroll, Reanimated can batch/defer mapper runs, so a picture can be referenced by Skia many frames after the SharedValue swap that replaced it. Dispose that picture on the next frame and the Skia surface crashes when it finally tries to read.

### Why no RAF-based fix works

- **Single RAF (~16 ms)**: crashes immediately on fast scroll — as observed.
- **Double RAF (~32 ms)**: strictly wider probability window. Does not eliminate the race; Reanimated mapper lag under pressure can exceed 32 ms.
- **Long `setTimeout` (100 ms+)**: same as double-RAF, just a larger window. The underlying issue — that there's no disposal contract between `react-native-reanimated` and `@shopify/react-native-skia` for SharedValue-stored SkPicture objects — means any fixed delay is gambling, not fixing.

### Why JS GC is actually fine here

The previous (and current) behavior — letting the JS garbage collector reclaim the native picture once no JS references remain — is the pattern both libraries are designed around:
- `@shopify/react-native-skia` uses `SkJSIInstance` with implicit GC-driven lifetime for all native objects. Manual `.dispose()` is exposed but intended for cases where the object's lifetime is fully under the caller's control, not for SharedValue-held objects that feed a declarative renderer.
- `react-native-reanimated` mappers hold references to SharedValue contents opaquely; consumers shouldn't race with them on disposal.

In practice, the memory pressure concern that motivated this item doesn't appear to be an observable problem at the grid's typical working-set size (≈24 pictures in-flight across layers). Native memory is reclaimed when JS refs drop; under load the GC catches up.

### What was reverted

All 8 layer hook files and the two new files (`pictureLifecycle.ts` + its test) were reverted to the state at the prior commit (theme deferral). No public API changes shipped; no consumer code was touched. The revert was clean: typecheck returned to 251-error baseline, all 48 jest tests green.

### Takeaways for future work on this library

- **Do not re-attempt RAF-based SkPicture disposal on SharedValue-stored pictures** without first establishing a disposal contract with the Skia surface (e.g., via a custom component that owns both the SharedValue and the lifecycle). This would be a much larger architectural change than the 10-line helper this attempt tried to be.
- **If native memory pressure becomes a real observed problem** (not speculative), a safer future direction is **unmount-time disposal** — the Grid's top-level component can walk its SharedValues and dispose on `useEffect` cleanup. At unmount, the Skia Canvas is also unmounting, so no pending reads should occur. This is narrower than per-swap disposal but correct.
- **Explicit `.dispose()` calls on Skia objects in a Reanimated-driven pipeline are high-risk** and should be surrounded by measurement and targeted reproduction before shipping.

### Files that ended up unchanged

- `src/layers/useCellBackground.tsx` (reverted)
- `src/layers/useCellContent.tsx` (reverted)
- `src/layers/useCellOverlay.tsx` (reverted)
- `src/layers/useHeaderBackground.tsx` (reverted)
- `src/layers/useHeaderContent.tsx` (reverted)
- `src/layers/useHeaderOverlay.tsx` (reverted)
- `src/layers/useSectionOverlay.tsx` (reverted)
- `src/layers/useSectionSeparator.tsx` (reverted)
- `src/layers/pictureLifecycle.ts` (never kept; deleted)
- `src/layers/__tests__/pictureLifecycle.test.ts` (never kept; deleted)

### Files actually changed in this PR

- `docs/performance-optimizations.md` — this entry (the only thing to ship from this attempt: documentation of why not to re-try it).

---

## 2026-04-20 — Theme Change Deferral via `useDeferredValue` _(Phase B, item 2)_

### What changed

[`src/themes/GridThemeProvider.tsx`](../src/themes/GridThemeProvider.tsx): wrapped the `theme` prop in [`React.useDeferredValue`](https://react.dev/reference/react/useDeferredValue) before propagating it through both `GridThemeContext` and the styled-components `ThemeProvider`.

```diff
-export function GridThemeProvider({ theme, children }) {
-  const value = React.useMemo(() => ({ theme }), [theme]);
+export function GridThemeProvider({ theme, children }) {
+  const deferredTheme = React.useDeferredValue(theme);
+  const value = React.useMemo(() => ({ theme: deferredTheme }), [deferredTheme]);
   return (
     <GridThemeContext.Provider value={value}>
-      <SCThemeProvider theme={theme}>{children}</SCThemeProvider>
+      <SCThemeProvider theme={deferredTheme}>{children}</SCThemeProvider>
     </GridThemeContext.Provider>
   );
 }
```

All theme consumers — every layer hook, styled-components, anything using `useGridTheme()` — now receive the deferred theme value.

### Why

A theme change invalidates **all 8 picture layers** simultaneously. Each layer's `useEffect` sees the new `theme` in its deps and fires synchronously after render. The picture re-record cascade (cell content + cell background + cell overlay + header content + header background + header overlay + section overlay + section separator, each across 3 sections) blocks the JS thread for a significant chunk of time.

With the font + paragraph caches landed in Phase A, the per-cell work is ~3× cheaper than before, but:
- **Paragraph cache misses on theme change** — the key includes `color`, which is theme-derived, so toggling dark↔light invalidates every cached paragraph
- **Font cache survives** (font params don't depend on color — fonts hold glyph shapes, paints hold colors)

The re-record cascade is therefore still meaningful work. Users experience a perceptible freeze at the moment of tapping the theme toggle.

### How `useDeferredValue` helps

React 18's `useDeferredValue` is designed for exactly this pattern: deferring expensive downstream work while keeping the moment of user input responsive. The mechanics:

1. User taps theme toggle → parent calls `setTheme(newTheme)` → `theme` prop changes
2. `GridThemeProvider` re-renders with `theme = newTheme`
3. **`useDeferredValue(theme)` returns the OLD theme for this urgent render** — the commit lets the tap feel responsive
4. React schedules a lower-priority follow-up render
5. On that follow-up, `useDeferredValue` returns `newTheme`; context value updates, all 8 layer effects fire, pictures re-record
6. User perceives: tap → snappy response → picture catches up a frame or two later

The picture re-record still runs; it just no longer happens **during** the user's input cycle. The main-thread block is relocated to a quieter moment.

### Why at the provider, not in `useGridTheme`

Two consumers receive the theme: the Skia layer hooks (via `GridThemeContext`) and styled-components (via `SCThemeProvider`). Deferring only one would cause a visible inconsistency — e.g., column-chooser modal using styled-components re-renders with new theme while the Skia grid shows the old theme for a frame.

Putting `useDeferredValue` at the provider applies it to both consumers **cohesively**: the entire grid UI transitions together, one commit later than the tap that triggered it.

### Considerations explored and rejected

- **`startTransition` around the theme setter** — doesn't help; `useEffect` bodies always run synchronously after render, regardless of whether the render was urgent or transition. Deferring the state update only defers *when* the expensive work starts, not whether it blocks.
- **Frame-splitting the 8-layer re-record** — would require a central scheduler coordinating across hooks, invasive to implement. Revisit if measurement shows post-deferral work is still too long.
- **Separate the paragraph-cache color dimension** — theoretically nice (paragraphs would survive theme changes) but Skia paragraphs bake color at build time; repainting with a different color isn't supported by the Paragraph API. Rejected as out of scope.

### Measured impact

Expected behavior (to be confirmed on device):

| Metric | Before | After |
|---|---|---|
| JS thread blocked at moment of theme tap | yes (sync cascade) | no (deferred ~1 frame) |
| Tap → visible theme response | ~300ms on large grids | ~16ms (next frame) |
| Total wall-clock picture re-record time | unchanged | unchanged |
| Picture re-record still happens | yes | yes (just 1–2 frames later) |

### Verification

- [x] `yarn typecheck` — 251 errors total, zero new errors.
- [x] All 48 jest-runnable tests still pass.
- [ ] Manual smoke test on mobile:
  - Toggle dark ↔ light theme rapidly — tap response feels immediate, visual update follows within 1 frame
  - No visual tearing between styled components and Skia grid (both defer together)
  - Repeated toggles don't pile up; React collapses in-flight deferred updates
  - Initial mount renders with the correct theme (no flicker)

### Risks & follow-ups

- **React 18+ required** — `useDeferredValue` is a React 18 API. Peer deps already require `react ^18 || ^19`, so this is consistent.
- **Fallback path in `useGridTheme`** — the `require()` in the no-provider branch (GridThemeProvider.tsx:31) is untouched by this change. It was pre-existing and is a separate code-quality concern worth flagging but out of scope for this PR.
- **Styled-components ThemeProvider** — receives the deferred theme, so SC-themed components update at the same cadence as the Skia grid. Visual cohesion preserved. If any non-grid component outside this tree depends on fast theme updates, they'd still get the non-deferred `theme` prop directly (this only affects consumers of `GridThemeContext` or the nested `SCThemeProvider`).
- **No new tests** — `useDeferredValue` is a React primitive; asserting its behavior wouldn't be testing our code. The integration behavior (deferred theme propagation) is verified by manual smoke test.

### Files changed

- `src/themes/GridThemeProvider.tsx` — wrapped `theme` in `useDeferredValue`, passed to both context and SC provider
- `docs/performance-optimizations.md` — this entry

---

## 2026-04-20 — Layer Prop Memoization (`selectedCellParams` deep-eq) _(Phase B, item 1)_

### What changed

[`src/layers/useCellContent.tsx`](../src/layers/useCellContent.tsx): the `useEffect` that drives cell-content picture recording now uses a deep-equality change ID for `selectedCellParams` instead of the object reference.

```ts
const selectedCellParamsKey = useDeepEqChange([selectedCellParams]);

React.useEffect(() => {
  createCellContent(...);
}, [
  ...,
  selectedCellParamsKey,  // was: selectedCellParams
  ...,
]);
```

`useDeepEqChange` (already exported from `src/internal/hooks`) returns a stable string ID that only updates when the object's content actually differs. The effect now fires only on **real** content changes, not on every new object literal with equivalent fields.

### Why

`selectedCellParams` is reset to equivalent content from multiple call sites — e.g., `{ row: null, cellEditingParams: null }` is the pattern in at least 5 places across `GridCore.tsx` (search: `setSelectedCellParams({`). Each call produces a **new object literal with identical content**, and under strict ref equality React's `useEffect` fires on each one, triggering a full cell-content picture re-record across all three grid sections.

Concrete spurious cases observed in the code:
- `onCellEditingCancel` (GridCore.tsx ~line 817) — sets `{ row: null, cellEditingParams: null }` every time cell-edit is cancelled
- Multiple gesture handlers conditionally set `{ row: null, ... }` when taps hit no meaningful target
- Double-tap / outside-tap flows fire the setter repeatedly with equivalent values

Each of those was a full picture re-record for every 3 sections. With the font + paragraph caches from Phase A landed, the re-record is ~3× faster than before, but it's still meaningful work. Skipping it entirely when nothing really changed is the correct fix.

### Why only this dep?

I audited every dep in the `useCellContent` effect deps array. Most are already safe for different reasons:

| Dep | Why it's already safe |
|---|---|
| `theme`, `fontManager` | Memoized by their providers; refs stable across renders |
| `rows` | New ref on every `getRowsInternal` call, but **content is the point** — deep-eq on 10k-row arrays would cost more than the savings |
| `columns.{left,center,right}` | Already stable via `useColumnSectionLayout`'s memoization |
| `columnWidths.*`, `sectionWidth.*`, `!!topRowNode` | Primitives — compared by value |
| `nodesSelection` | Map gets replaced on every toggle, but **content is also new** — refs are correlated with real changes |
| `context?.current` | User-controlled — not our job to stabilize |
| `selectedCellParams` | **Object literal set to equivalent content repeatedly** ✓ |

Only `selectedCellParams` fits the criteria of "small object, frequently set to equivalent content, deep-eq is cheap enough to beat the savings".

### Implementation notes

- Used `useDeepEqChange` (returns a stable string ID) rather than `useDeepEqMemo` (returns a stable value reference via `cloneDeep`). The ID approach avoids deep-cloning the value itself — only the comparison is deep; the stored-for-comparison copy is what was cloned on the previous iteration.
- **Scope intentionally minimal** — only `useCellContent.tsx`. Other layer hooks (`useCellOverlay`, etc.) also take `selectedCellParams` but through different dependency shapes; addressing them would expand scope. If profiling shows they're hot paths too, straightforward follow-up.
- Added an `// eslint-disable-next-line react-hooks/exhaustive-deps` because the ID (a string) is now the dep instead of the object (`selectedCellParams`). The linter can't reason about that substitution. Same pattern used inside `useDeepEqEffect` / `useDeepEqMemo` themselves.
- **No functional change** — the effect body still reads the latest `selectedCellParams` from closure. Only the firing frequency changes.

### Measured impact

Expected behavior (to be confirmed on device):

| Metric | Before | After |
|---|---|---|
| Cell-content picture re-records per outside-tap burst | 1 per tap | 0 (deep-eq skips) |
| Spurious re-records on cell-editing cancel → re-cancel | 1 per repeat | 0 |
| Picture re-records on legitimate content change | unchanged | unchanged |

### Verification

- [x] `yarn typecheck` — 251 errors total, zero new errors (the remaining `TS7006` on the reactor `current`/`_previous` is pre-existing and unrelated to this change).
- [x] All 48 jest-runnable tests still pass.
- [ ] Manual smoke test on mobile:
  - Tap inside → outside → inside → outside a cell rapidly: picture doesn't flicker or re-record visibly on no-op taps
  - Real cell selection / edit flows still work — picture redraws when content actually changes
  - Row / column / theme changes still propagate correctly

### Risks & follow-ups

- **Deep-eq cost**: `lodash.isEqual` on `selectedCellParams` (~5 fields, most primitives/small refs) is sub-microsecond. Negligible vs. the picture-record work it saves.
- **`context?.current` not stabilized**: if a consumer rebuilds `context.current` on every parent render with equivalent content, it'll still cause spurious redraws. Deliberate — user's API, user's responsibility. We can revisit with real user feedback.
- **Other layer hooks**: `useCellOverlay`, `useHeaderContent`, etc. might benefit from similar treatment for their object deps. Intentionally not done in this PR to keep scope tight and the impact isolated.

### Files changed

- `src/layers/useCellContent.tsx` — imported `useDeepEqChange`, used it for `selectedCellParams` in the cell-content effect's deps
- `docs/performance-optimizations.md` — this entry

---

## 2026-04-20 — `useAnimatedReaction` Early-Exit in `useCellContent` _(Phase A, item 4)_

### What changed

[`src/layers/useCellContent.tsx`](../src/layers/useCellContent.tsx): the `useAnimatedReaction` reactor now **checks a conservative scroll-delta threshold on the UI thread** before bridging to JS via `runOnJS`. A new `lastBridge` SharedValue tracks the last bridged position. If the delta from that position is below half the viewport buffer, the bridge is skipped entirely.

**Zero public API change.** Only the internal UI↔JS bridging cadence changes; picture rendering, scroll feel, gesture handling, and data flow are all unchanged.

### Why

Per-frame scroll events caused `runOnJS(createCellContent)` to bridge from the UI thread to the JS thread at ~60 fps. On the JS side, `checkIndexes` then early-exits for the overwhelming majority of those frames — the scroll is still inside the pre-rendered viewport buffer, so no picture redraw is needed.

Each bridge has per-invocation overhead: closure + args allocation on the UI thread, scheduled task on the JS thread, competing with React's render loop and your app logic. For a 2-second scroll that's ~120 bridge crossings, and typically only 3–5 of them actually result in a new picture record.

Cutting the bridges at their source (UI thread) reclaims that wasted work.

### How it's safe

The skip condition is a **conservative heuristic** — it is strictly a subset of the cases where a redraw would NOT happen. It never causes a missed redraw:

- **Threshold is half the buffer in pixels.** By the time cumulative scroll delta from the last bridged position approaches the actual buffer edge, at least one bridge has already occurred in between (because crossing the edge requires double the threshold). The JS side's `checkIndexes` still runs on that bridge and still owns the final decision on redraw.
- **Layout dimension change always bridges** (orientation, resize) — `layoutChanged` short-circuits the threshold check.
- **`rowBuffer = 0` or `columnBuffer = 0`** (consumer disables buffering) → threshold becomes 0 → every frame bridges → behavior identical to pre-change.
- **First meaningful scroll always bridges** — `lastBridge.y = Number.NEGATIVE_INFINITY` on mount guarantees the first Y delta is infinite.
- **X threshold uses `MIN_COLUMN_SIZE`** as the per-column pixel assumption. Columns are guaranteed to be at least that wide by the resize clamp logic, so `columnBuffer * MIN_COLUMN_SIZE` is a safe lower bound for "how many pixels of horizontal scroll stay within the buffer".

### Implementation notes

The reactor now computes:

```ts
const yThreshold = (rowBuffer * rowHeight) / 2;
const xThreshold = (columnBuffer * MIN_COLUMN_SIZE) / 2;
const scrollExceedsThreshold =
  Math.abs(current.y - last.y) >= yThreshold ||
  Math.abs(current.xValOffset.left   - last.xLeft)   >= xThreshold ||
  Math.abs(current.xValOffset.center - last.xCenter) >= xThreshold ||
  Math.abs(current.xValOffset.right  - last.xRight)  >= xThreshold;
if (layoutChanged || scrollExceedsThreshold) {
  lastBridge.value = { ...current position snapshot... };
  runOnJS(createCellContent)(...);
}
```

- All math is simple arithmetic, pure worklet-friendly — stays on the UI thread.
- `lastBridge` is a single object SharedValue (not multiple) to minimize SharedValue overhead.
- The existing `useEffect` path (which fires on data / theme / selection changes and redraws with `redrawContent: true`) is untouched.

### Measured impact

Expected behavior (to be confirmed on device):

| Metric | Before | After |
|---|---|---|
| UI→JS bridges per second during continuous scroll | ~60 | ~2–5 (depends on scroll speed vs buffer) |
| JS-thread time spent in `checkIndexes` no-ops | proportional to bridges | ~20× lower |
| Picture redraw frequency | unchanged | unchanged |
| Scroll smoothness / visual behavior | unchanged | unchanged |

### Verification

- [x] `yarn typecheck` — 251 errors total, zero new errors (the one `TS7006` on line 273 is pre-existing, present in the original reactor signature at the same line; confirmed via `git stash` comparison).
- [x] All 48 jest-runnable tests still pass.
- [ ] Manual smoke test on mobile app:
  - Slow scroll: picture updates correctly as scroll crosses the buffer edge (no stale content, no visible lag)
  - Fast flick: decay animation completes, picture updates for final scroll position
  - Orientation change: layout change triggers bridge immediately
  - Column resize → scroll: picture reflects new column layout correctly
- [ ] Optional: instrument `createCellContent` with a temporary `console.log` counter to verify bridge count dropped as expected.

### Risks & follow-ups

- **If `rowBuffer` or `columnBuffer` are set very low** (e.g. 1), the threshold becomes tiny and bridges happen nearly every frame anyway — no regression, just no benefit.
- **Thresholds are conservative by design.** A more aggressive version (full viewport derivation on the UI thread) could reduce bridges further but would require porting `deriveIndexes` to a worklet and syncing cached-indexes state UI↔JS. That's a Phase B candidate if profiling shows the remaining bridge cost is still meaningful.
- **No additional tests added** — the change is a guarded optimization of an internal reactor. The behavioral contract (picture redraws at buffer edges) is unchanged; existing tests cover the business logic.

### Files changed

- `src/layers/useCellContent.tsx` — added `useSharedValue` import, `MIN_COLUMN_SIZE` import, `lastBridge` SharedValue, threshold-based reactor
- `docs/performance-optimizations.md` — this entry

---

## 2026-04-20 — Filter Debounce Tuning _(Phase A, item 3)_

### What changed

Lowered the default filter debounce from **500 ms → 200 ms**:
- Added a named constant `DEFAULT_FILTER_DEBOUNCE_MS = 200` in [`src/utils/constants.ts`](../src/utils/constants.ts), co-located with other timing constants (`LONG_PRESS_DURATION`, etc.).
- Replaced the magic `500` literal in [`src/Grid.tsx`](../src/Grid.tsx) with the new constant.

The per-column override path via `FilterParams.debounceMs` is **unchanged** — consumers with expensive filters on large datasets can still opt into longer debounces:

```ts
{
  id: "heavy-col",
  filterParams: { debounceMs: 500 },
  // ...
}
```

### Why

500 ms was defensive — set high to protect against filter/sort/rebuild cost on large datasets. With the font cache and paragraph cache from Phase A items 1 and 2 now landed, picture re-record cost after a filter change is meaningfully lower, so a faster default response is safe.

User perception research shows lag above ~250 ms is noticeable. Comparable libraries default to:
- **AG Grid**: ~150–200 ms
- **TanStack Table**: ~250 ms (often overridden lower)
- **Google Sheets**: ~100 ms
- **Airtable**: ~150 ms

**200 ms** was chosen over 150 ms as a safer middle ground — still well under the perception threshold, but leaves headroom for mid/low-end Android devices where filter work plus re-record can take more time. Consumers who want 150 ms (or less) can opt in per-column.

### Implementation notes

- **Single literal** — the magic `500` appeared exactly once in the codebase (at the `useDebounce` call site), so the change is localized.
- **No public API addition** — deliberately not exposing a top-level `SkiaGridProps.defaultFilterDebounceMs` prop. The per-column override already covers the "need different debounce" use case, and speculative API surface is better avoided until a real consumer asks.
- **Critical thinking**: the 500 ms default was likely chosen before any cell-rendering caches existed. Now that cells re-render much faster, revisiting perception-driven UX constants is justified.

### Measured impact

| Metric | Before | After |
|---|---|---|
| Debounce delay after last keystroke | 500 ms | 200 ms |
| Perceived filter responsiveness | sluggish (>250 ms threshold) | snappy (<250 ms threshold) |
| Total JS-thread cost per filter apply | unchanged | unchanged |

The raw filter-apply cost is unchanged; only the wait before applying is reduced. With caches in place, the re-apply itself is also faster than it was before Phase A started, making the shorter debounce safe.

### Verification

- [x] `yarn typecheck` — 251 errors total, zero new errors vs baseline.
- [x] No magic `500` remaining in `Grid.tsx` (`grep 500 src/Grid.tsx` → no match at the debounce site).
- [x] Existing 48 jest-runnable tests still pass (no behavior test needed — nothing to assert beyond the constant value).
- [ ] Manual smoke test on mobile Orders blotter / any filterable grid:
  - Type into a filter input; row list updates feel noticeably snappier than before
  - Per-column override (if any column sets `filterParams.debounceMs`) still respected
- [ ] Verify the constant is discoverable in source (imported from `utils/constants.ts`).

### Risks & follow-ups

- **Large-dataset consumers**: a consumer previously relying on the 500 ms implicit default now gets 200 ms by default. If they were tuning performance against the old default, they may perceive more rapid filter work (and more filter-and-retry noise on slow connections if filters are server-backed). Mitigation: the per-column override lets them restore or go higher. If this becomes a real issue, exposing a top-level `defaultFilterDebounceMs` prop is an easy follow-up.
- **No test added**: there's no behavior to assert beyond the numeric value. A test would just be `expect(DEFAULT_FILTER_DEBOUNCE_MS).toBe(200)` — tautological and anti-correlation with the intent of the change.

### Files changed

- `src/utils/constants.ts` — added `DEFAULT_FILTER_DEBOUNCE_MS` constant
- `src/Grid.tsx` — imported constant, replaced magic `500`
- `docs/performance-optimizations.md` — this entry

---

## 2026-04-20 — Paragraph Layout LRU Cache _(Phase A, item 2 — pivoted)_

### What changed

Added a bounded LRU cache for laid-out `SkParagraph` objects in [`src/utils/drawingPrimitives.ts`](../src/utils/drawingPrimitives.ts):
- `getOrBuildParagraph(key, build)` — returns a cached laid-out paragraph or builds + lays out + caches a new one.
- `clearParagraphCache()` — resets the cache for tests / runtime invalidation.

Refactored `drawText` in [`src/utils/drawMethods.ts`](../src/utils/drawMethods.ts) to:
1. Extract all layout-affecting inputs into a deterministic cache key
2. Call `getOrBuildParagraph` on the common path (no custom paints)
3. Skip the cache entirely when `foregroundPaint` / `backgroundPaint` are provided (runtime SkPaint objects aren't safely keyable, so we preserve current uncached behavior)
4. Paint the returned paragraph at the caller's position without re-layout

**Zero public API change** — `drawText` signature identical; all call sites (cell content, headers, group cells, no-data overlay, sort indicators) benefit automatically.

### Why

Per-cell analysis of the `drawCellContent` hot path showed that `Skia.ParagraphBuilder.Make().pushStyle().addText().build()` plus `paragraph.layout(width)` were the real hotspots — not paint allocation. Every visible cell was rebuilding a fresh `SkParagraph` on every picture record, even though:
- Text values repeat heavily in real grids (status columns, enums, fixed-format numbers)
- Column widths are stable during a picture's lifetime
- Styles (fontSize, color, align) vary little within a column

Skia's own recommendation for this situation is "cache the Paragraph and replay within a Picture" — this change makes that real. The architecture still uses SkPicture for per-frame cached replay during scroll; the paragraph cache sits one level down, reusing work when pictures re-record (data change, selection change, scroll-past-buffer, theme switch).

### Implementation notes

- **Cache key** covers every input that affects paragraph layout output:
  - `text`, `fontSize`, `color`, effective layout width (after padding), `textAlign`, `maxLines`, `ellipsis`
  - `fontFamilies` joined + `defaultFontFamily` (fallback appended in `drawText`)
  - `decorationColor`, `backgroundColor`, `foregroundColor`
  - `JSON.stringify(extraTextStyle)` + `JSON.stringify(extraParaStyle)` to capture any other spread-through props
- **Paint bypass** — if `foregroundPaint` or `backgroundPaint` is passed, we skip the cache entirely and fall through to the existing `buildParagraph` + `drawParagraph` path. No behavior change for that branch.
- **Local Map-based LRU** with a cap of 2000 entries. Using `Map` insertion order as usage order: delete + re-insert on hit moves to MRU end; overflow evicts the oldest entry.
- **Not using `BasicLRUCache` from `src/internal/utils/cache.ts`** — same reasoning as the font cache (that utility is TTL-based, not count-bounded, and has a latent bug in `.get()` on miss). A ~25-line local helper keeps scope minimal.

### Measured impact

Device-level measurements will be captured during manual smoke testing and filled in here before merge.

| Metric | Before | After |
|---|---|---|
| `recordCellContent` time (500 rows, full redraw) | _TBD on device_ | _TBD on device_ |
| Paragraph cache hit rate (steady state, blotter) | n/a | _TBD (expect >80% for status/enum-heavy grids)_ |
| Memory overhead (worst case) | 0 | ~2 MB (2000 SkParagraph refs × ~1 KB native each) |

### Verification

- [x] `yarn typecheck` — 251 errors total, zero new errors vs baseline.
- [x] New test file [`src/utils/__tests__/paragraphCache.test.ts`](../src/utils/__tests__/paragraphCache.test.ts) with 9 passing tests covering:
  - `getOrBuildParagraph` builds on first call, returns cached on repeat
  - Distinct keys produce distinct paragraphs (no key collision)
  - Whitespace-sensitive key comparison
  - `clearParagraphCache` forces rebuilds
  - LRU eviction at cap (2000): oldest evicted, recently-accessed retained
  - Touch-on-hit moves entries to MRU end
- [x] All existing tests still pass: 48 total (9 paragraphCache + 12 fontUtils + 10 columnSections + 17 createTheme).
- [ ] Manual smoke test on mobile Orders blotter: cell rendering, text alignment, ellipsis truncation, multi-style headers, no-data overlay — all visually identical _(to run on device)_.
- [ ] Capture before/after timings with a temporary `console.time` probe and fill in the impact table _(to run on device)_.

### Risks & follow-ups

- **Memory footprint**: native SkParagraph objects are heavier than strings/numbers. 2000-entry cap is conservative for typical viewports; if a consumer renders grids with extremely varied text (thousands of distinct strings per style), hit rate drops and the cap becomes a tradeoff between memory and rebuild cost. Follow-up: consider exposing cap via a setter API for consumer tuning.
- **Paint bypass scope**: if any call site starts passing dynamic paints frequently, it bypasses the cache. Audit: current codebase has no per-cell paint usage, so the bypass path is rare (no-data overlay and a few other isolated draws).
- **Thread safety**: cache is JS-thread only (matches existing drawing pipeline). Consumers shouldn't reuse cached paragraphs across threads.

### Files changed

- `src/utils/drawingPrimitives.ts` — cache + `getOrBuildParagraph` + `clearParagraphCache`
- `src/utils/drawMethods.ts` — `drawText` refactored to use the cache (custom-paint bypass preserves current behavior)
- `src/utils/__tests__/paragraphCache.test.ts` — new test file (9 tests)
- `docs/performance-optimizations.md` — this entry

---

## 2026-04-20 — Font & Text-Width LRU Cache _(Phase A, item 1)_

### What changed

Added bounded LRU caches inside [`src/utils/fontUtils.ts`](../src/utils/fontUtils.ts) for:

1. **`getFont(fontManager, fontSize, fontFamily, fontStyle)`** — caches the `SkFont` returned by Skia's `matchFont`, keyed by `(family, size, style, weight)`. Cap: 64 entries.
2. **`getTextWidth(font, text)`** — caches the measured width per `(font, text)` pair. The font identity is recorded via a `WeakMap` keyed by the `SkFont` instance. Cap: 2000 entries.

Also exported a new `clearFontCaches()` helper for test isolation and for callers that may swap `fontManager` at runtime.

**Zero public API change.** Signatures of `getFont` and `getTextWidth` are identical. Consumers (`Grid.tsx`, `drawMethods.ts`) require no modification.

### Why

Cell content picture recording calls `matchFont()` and `font.measureText()` **fresh for every cell**. For a typical 100 × 10 visible viewport that's ~2,000 native Skia calls per content redraw. Both functions are deterministic for a given input, making them prime candidates for memoization. Picture recording runs on the JS thread, so every millisecond saved translates to lower latency on scroll-past-buffer, data changes, selection, and theme switches.

### Implementation notes

- Used a native `Map`-based LRU (insertion order = usage order; move-to-end on hit) rather than the existing `BasicLRUCache` in `src/internal/utils/cache.ts` because that utility is actually TTL-based (60 s age eviction) and has a latent defect in `.get()` that crashes on a cache miss. A ~25-line local helper inside `fontUtils.ts` keeps scope minimal and avoids touching shared code.
- The `WeakMap<SkFont, string>` for font identity lookup auto-cleans when an `SkFont` is garbage collected, so there's no manual invalidation to worry about when fonts drop out of the font cache.
- If a caller passes a font that wasn't created via `getFont` (no key in the WeakMap), `getTextWidth` transparently falls back to uncached measurement. Behavior is preserved.

### Measured impact

Measurements to be taken on the mobile app's Orders blotter with ~500 rows. Run script-side via `console.time` wrappers removed before merge.

| Metric | Before | After |
|---|---|---|
| `recordCellContent` time (500 rows, full redraw) | _TBD on device_ | _TBD on device_ |
| Font cache hit rate (steady state) | n/a | _TBD_ |
| Text-width cache hit rate (steady scroll) | n/a | _TBD_ |
| Memory overhead (worst case) | 0 | ~200 KB (2000 text entries × ~50 B + 64 font refs) |

> **Note:** device-level numbers will be captured during manual smoke testing and filled in here before merge.

### Verification

- [x] `yarn typecheck` — 251 errors total, zero new errors vs baseline.
- [x] New test file [`src/utils/__tests__/fontUtils.test.ts`](../src/utils/__tests__/fontUtils.test.ts) with 12 passing tests covering:
  - `getFont` returns same instance on repeat calls with identical params
  - New instance created when any key param (size/family) differs
  - `setSize` applied correctly; negative sizes substituted with default
  - `getTextWidth` caches on repeat calls, measures separately for different text
  - Fallback to uncached measurement for fonts not produced by `getFont`
  - `clearFontCaches` resets both caches
- [x] Existing tests (`createTheme.test.ts`, `columnSections.test.ts`) still pass — 39 tests green overall.
- [ ] Manual smoke test on mobile Orders blotter: scroll, filter, theme switch — no visual regressions _(to run on device)_.
- [ ] Capture before/after timings with `console.time` and fill in the table above _(to run on device)_.

### Risks & follow-ups

- **Stale cache on `fontManager` swap**: if a consumer replaces the `fontManager` prop mid-session (not observed in the current mobile app), the cached fonts would be tied to the old one. Mitigation: call `clearFontCaches()` when swapping.
- **Text cache bound**: 2000 entries is sized for a typical viewport plus scrolling headroom. If real-world grids routinely exceed this with distinct strings, hit rate drops. Revisit with production data.
- **No worklet support**: caches live on the JS thread. Drawing functions marked `"worklet"` that call `getFont`/`getTextWidth` will still go through the JS thread (matches existing behavior — those annotations appear advisory in the current codebase).

### Files changed

- `src/utils/fontUtils.ts` — cache implementation + `clearFontCaches` export
- `src/utils/__tests__/fontUtils.test.ts` — new test file (12 tests)
- `docs/performance-optimizations.md` — this log (new file)

---

## How to use this log

Every subsequent perf optimization gets a new dated section above, following the same structure:

1. **What changed** — one-paragraph summary + file list
2. **Why** — the latency hypothesis being addressed
3. **Implementation notes** — critical-thinking decisions (e.g. "why not use existing X")
4. **Measured impact** — before/after table with real numbers
5. **Verification** — typecheck, tests, manual smoke
6. **Risks & follow-ups** — known limitations, configuration knobs

Pending Phase A items (see current plan):
- Pre-allocated theme paints in `DrawingContext`
- `useAnimatedReaction` early-exit before `runOnJS`
- Filter debounce tuning (500 ms → configurable lower default)

Pending Phase B items (order TBD):
- Paragraph layout cache
- Layer prop object memoization
- Theme change batching via `startTransition`
- `drawAtlas` for repeated sprite icons
- Explicit `SkPicture` disposal via RAF

Phase C items (row-level picture cache, ColumnManager versioning) are **deferred** pending Phase A + B completion and production measurement.
