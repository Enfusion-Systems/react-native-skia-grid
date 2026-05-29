/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");
const skiaGridPkg = repoRoot;
const exampleNodeModules = path.resolve(projectRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

// Watch the skia-grid source so edits hot-reload.
config.watchFolders = [
  ...(config.watchFolders || []),
  skiaGridPkg,
];

// Resolve all skia-grid peer deps from this app's node_modules.
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  exampleNodeModules,
];

// Don't auto-resolve JSON as an asset (Detox attaches its own).
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "json"
);

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
