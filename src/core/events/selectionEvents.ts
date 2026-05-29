import type { GridEvent } from "../types";

// SelectionManager emits SelectionChanged whenever the underlying
// nodesSelection map mutates — toggle, header-press, imperative API,
// row-data delta, etc. React reads the map via useSyncExternalStore against
// `SelectionManager.getNodesSelection()`; the event is the cache-busting
// signal.

export const SelectionEventTypes = {
  SelectionChanged: "selection:changed",
} as const;

export type SelectionChangedEvent = GridEvent & {
  type: typeof SelectionEventTypes.SelectionChanged;
  nodesSelection: Map<string, 0 | 1 | 2>;
};

export type SelectionEvent = SelectionChangedEvent;
