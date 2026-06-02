import { expect } from "@jest/globals";

/**
 * Registers the `toMatchImageSnapshot` matcher (jest-image-snapshot) for the
 * visual-regression harness. Wired via `setupFilesAfterEnv` so the matcher is
 * available to every spec.
 *
 * Loaded defensively: if jest-image-snapshot isn't installed yet, state-bridge
 * specs still run untouched and only visual specs fail (explicitly) when they
 * call the matcher.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { toMatchImageSnapshot } = require("jest-image-snapshot");
  (expect as unknown as { extend: (m: Record<string, unknown>) => void }).extend(
    { toMatchImageSnapshot }
  );
} catch {
  // eslint-disable-next-line no-console
  console.warn(
    "[visual] jest-image-snapshot not installed — visual snapshot specs will fail until `yarn install` runs in example/."
  );
}
