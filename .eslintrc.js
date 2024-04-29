module.exports = {
  extends: ["@enfusion-ui/eslint-config/react"],
  env: {
    node: true,
  },
  globals: {
    page: true,
    context: true,
  },
  overrides: [
    {
      files: ["**/*.ts?(x)"],
      plugins: ["react-native"],
      env: {
        browser: true,
        node: true,
        es6: true,
      },
      rules: {
        "react/require-default-props": "off",
        "react/jsx-props-no-spreading": "off",
        "no-param-reassign": "off",
        "import/no-deprecated": "off",
        "react/style-prop-object": "off",
      },
    },
  ],
};
