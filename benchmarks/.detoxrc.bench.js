/**
 * Detox config for the perf harness. Reuses the example app's full device/app
 * configuration and only swaps the jest runner config so benchmarks run from
 * example/e2e/bench/ instead of the correctness specs.
 *
 * Run from example/:  detox test -C ../benchmarks/.detoxrc.bench.js -c ios.sim.debug
 * (wired as `yarn bench:ios`). All relative paths in the base config (binaryPath,
 * build, jest config) resolve against the example/ cwd, unchanged.
 *
 * @type {Detox.DetoxConfig}
 */
const base = require("../example/.detoxrc");

module.exports = {
  ...base,
  testRunner: {
    ...base.testRunner,
    args: {
      ...base.testRunner.args,
      config: "e2e/jest.bench.config.js",
    },
  },
};
