import { EventBus } from "./eventBus";
import type {
  EngineHost,
  GridCommand,
  GridEvent,
  Manager,
  Middleware,
  Unsubscribe,
} from "./types";

// Facade over the manager set. Consumers dispatch commands and subscribe to
// events; managers encapsulate the actual state and logic. The engine itself
// holds no grid state — routing + event fan-out only.
export class GridEngine implements EngineHost {
  private readonly bus = new EventBus<GridEvent>();
  private managers: Manager[] = [];

  // Dispatch interceptors. Each one wraps the next via a `next` continuation
  // (Redux-style). Order = registration order; the first-registered runs
  // outermost. See `dispatch()` for chain construction.
  private middlewares: Middleware[] = [];

  // Batch machinery. While batchDepth > 0, emits are buffered into
  // pendingEmits instead of fanning out. When the outermost batch() finishes
  // we dedup by event type (keeping the latest) and fire one emit per type.
  //
  // Why: consumers that drive multiple state changes within a single
  // React commit (e.g. columns + sort + context dispatched together) would
  // otherwise trigger one RowsChanged emit per dispatch — each of which
  // becomes a useSyncExternalStore re-render and a downstream picture
  // re-record. For large grids that cascades into seconds of blocking
  // work. Batching collapses them to a single emit.
  private batchDepth = 0;
  private pendingEmits: GridEvent[] = [];

  register(manager: Manager): void {
    manager.init?.(this);
    this.managers.push(manager);
  }

  use(middleware: Middleware): Unsubscribe {
    this.middlewares.push(middleware);
    return () => {
      const idx = this.middlewares.indexOf(middleware);
      if (idx >= 0) this.middlewares.splice(idx, 1);
    };
  }

  dispatch(command: GridCommand): void {
    // Snapshot the middleware list so that mid-dispatch registration /
    // removal doesn't shift the chain underfoot.
    const chain = this.middlewares;
    if (chain.length === 0) {
      this.runManagers(command);
      return;
    }

    // Build the continuation lazily. Each call to `next` advances one slot
    // in the chain; the tail invokes the actual manager dispatch.
    const dispatchNext = (i: number) => (cmd: GridCommand) => {
      if (i < chain.length) {
        chain[i](cmd, dispatchNext(i + 1));
      } else {
        this.runManagers(cmd);
      }
    };
    dispatchNext(0)(command);
  }

  // Manager dispatch loop. First manager whose handle() returns true claims
  // the command; remaining managers don't see it.
  private runManagers(command: GridCommand): void {
    for (const m of this.managers) {
      if (m.handle(command)) return;
    }
  }

  batch(fn: () => void): void {
    this.batchDepth++;
    try {
      fn();
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0) this.flushPending();
    }
  }

  // Flush pending emits one "round" at a time. Each round is itself
  // batched, so any emits produced by listeners during the round (e.g.
  // RowManager emitting RowsChanged after receiving a ColumnManager
  // event) accumulate into the next round instead of firing immediately.
  // Loop terminates when a round produces no new pending emits —
  // typical cascades bottom out after 1-2 rounds.
  private flushPending(): void {
    while (this.pendingEmits.length > 0) {
      const current = this.pendingEmits;
      this.pendingEmits = [];
      const byType = new Map<string, GridEvent>();
      for (const event of current) byType.set(event.type, event);

      this.batchDepth++;
      try {
        for (const event of byType.values()) this.bus.emit(event);
      } finally {
        this.batchDepth--;
      }
    }
  }

  emit(event: GridEvent): void {
    if (this.batchDepth > 0) {
      this.pendingEmits.push(event);
      return;
    }
    this.bus.emit(event);
  }

  on(type: string, listener: (event: GridEvent) => void): Unsubscribe {
    return this.bus.on(type, listener);
  }

  onAny(listener: (event: GridEvent) => void): Unsubscribe {
    return this.bus.onAny(listener);
  }

  dispose(): void {
    this.managers.forEach((m) => m.dispose?.());
    this.managers = [];
    this.middlewares = [];
    this.bus.dispose();
    this.pendingEmits = [];
    this.batchDepth = 0;
  }
}
