/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: "..",
  testMatch: ["<rootDir>/e2e/specs/**/*.spec.ts"],
  testTimeout: 120000,
  maxWorkers: 1,
  setupFilesAfterEnv: ["<rootDir>/e2e/setupVisual.ts"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  reporters: ["detox/runners/jest/reporter"],
  testEnvironment: "detox/runners/jest/testEnvironment",
  verbose: true,
  preset: "ts-jest",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "e2e/tsconfig.json" }],
  },
};
