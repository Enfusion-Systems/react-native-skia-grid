import type { GridReportableState } from "react-native-skia-grid";

const STATE_BRIDGE_TEST_ID = "grid-state";

type Attributes = { label?: string; text?: string };

/**
 * Read the grid's reportable state. The example app renders the state into
 * a hidden View's accessibilityLabel; this parses it back into a typed object.
 *
 * Returns null while the grid hasn't reported state yet (e.g. between mount
 * and first redraw). Callers should poll via {@link waitForGridState}.
 */
export async function readGridState(): Promise<GridReportableState | null> {
  const node = element(by.id(STATE_BRIDGE_TEST_ID));
  const raw = (await node.getAttributes()) as Attributes;
  const label = raw.label ?? raw.text ?? "";
  if (!label) return null;
  try {
    return JSON.parse(label) as GridReportableState;
  } catch {
    return null;
  }
}

/**
 * Poll the state bridge until `predicate` returns true or timeout elapses.
 * Cheaper than `waitFor` on Skia content because there's no native view to
 * inspect.
 *
 * @param predicate Pure function; should not have side effects.
 * @param opts.timeout default 5000ms
 * @param opts.interval default 100ms
 */
export async function waitForGridState(
  predicate: (state: GridReportableState) => boolean,
  opts: { timeout?: number; interval?: number; description?: string } = {}
): Promise<GridReportableState> {
  const { timeout = 5000, interval = 100, description = "grid state" } = opts;
  const deadline = Date.now() + timeout;
  let last: GridReportableState | null = null;
  while (Date.now() < deadline) {
    last = await readGridState();
    if (last && predicate(last)) return last;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(
    `Timed out after ${timeout}ms waiting for ${description}. ` +
      `Last state: ${last ? JSON.stringify(last) : "null"}`
  );
}
