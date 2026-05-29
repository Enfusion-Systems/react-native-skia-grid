/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

module.exports = function config(api) {
  api.cache(true);
  return {
    presets: ["module:@react-native/babel-preset"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "react-native-skia-grid": path.resolve(
              __dirname,
              "../src"
            ),
          },
        },
      ],
      // react-native-reanimated/plugin MUST be listed last.
      "react-native-reanimated/plugin",
    ],
  };
};
