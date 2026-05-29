import * as React from "react";

import type { EngineHost } from "../core/types";

// Bridges a GridEngine event + manager snapshot into React via
// useSyncExternalStore. `subscribe` identity is driven by [engine, eventType]
// so resubscription happens exactly when the source changes; `getSnapshot`
// must already return a stable reference between mutations (the managers do).
export function useEngineStore<T>(
  engine: EngineHost,
  eventType: string,
  getSnapshot: () => T
): T {
  const subscribe = React.useCallback(
    (notify: () => void) => engine.on(eventType, () => notify()),
    [engine, eventType]
  );
  return React.useSyncExternalStore(subscribe, getSnapshot);
}
