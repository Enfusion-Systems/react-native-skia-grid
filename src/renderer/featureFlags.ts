/**
 * Phase-3 (UI-thread layer recording) rollout flags. Per-layer so each layer can
 * be promoted to a UI-thread `useDerivedValue` worklet independently, validated,
 * and rolled back by flipping a single boolean — the JS `useEffect` path stays
 * in place behind the flag until a layer's exit criteria are met.
 *
 * Default OFF: production behavior is unchanged. These are read as build-time
 * constants, so toggling one keeps React hook order stable per app lifetime.
 */
export const UI_THREAD_LAYERS = {
  /** C1 pilot — pure-geometry separator (no text/fontManager). Pattern proven
   * (UI-thread createPicture in useDerivedValue); kept OFF since the separator
   * isn't a hot layer — no perf benefit to running it on the UI thread. */
  sectionSeparator: false,
  /** C2 — cell background row stripes (geometric). */
  cellBackground: false,
} as const;
