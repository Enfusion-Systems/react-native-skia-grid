export interface GridCommand {
  readonly type: string;
}

export interface GridEvent {
  readonly type: string;
}

export interface Manager {
  init?(host: EngineHost): void;
  // true = handled, false = pass to next manager
  handle(command: GridCommand): boolean;
  dispose?(): void;
}

export type Unsubscribe = () => void;

// Cross-cutting interceptor wrapped around dispatch. Receives the command +
// a `next` continuation. Implementations can:
//   - call next(cmd) verbatim → pass through unchanged
//   - call next(transformedCmd) → rewrite the command in flight
//   - skip calling next → suppress the dispatch entirely
//   - run code on either side of next → logging, perf timing, telemetry
// Middlewares run in registration order (first-registered = outermost).
export type Middleware = (
  command: GridCommand,
  next: (command: GridCommand) => void
) => void;

export interface EngineHost {
  emit(event: GridEvent): void;
  dispatch(command: GridCommand): void;
  // Managers use this to subscribe to events emitted by other managers.
  // Returned Unsubscribe is stored by the manager and called in dispose().
  on(type: string, listener: (event: GridEvent) => void): Unsubscribe;
  // Register a dispatch interceptor. See Middleware above for the contract.
  // Returned Unsubscribe removes the middleware from the chain.
  use(middleware: Middleware): Unsubscribe;
}
