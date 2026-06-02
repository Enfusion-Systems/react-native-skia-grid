/**
 * Jest config for the perf benchmarks (example/e2e/bench/*.bench.ts). Kept
 * separate from jest.config.js so benchmarks never run inside the correctness
 * suite. Driven by benchmarks/.detoxrc.bench.js via `yarn bench:ios`.
 *
 * `isolatedModules` lets ts-jest transpile the cross-folder imports from the
 * repo-root benchmarks/ dir without tripping the e2e tsconfig `include`.
 *
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  rootDir: "..",
  testMatch: ["<rootDir>/e2e/bench/**/*.bench.ts"],
  testTimeout: 600000,
  maxWorkers: 1,
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  reporters: ["detox/runners/jest/reporter"],
  testEnvironment: "detox/runners/jest/testEnvironment",
  verbose: true,
  preset: "ts-jest",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      { tsconfig: "e2e/tsconfig.json", isolatedModules: true },
    ],
  },
};
