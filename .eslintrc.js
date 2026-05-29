module.exports = {
  root: true,
  extends: ["@enfusion-ui/eslint-config/react"],
  rules: {
    "no-param-reassign": "off",
    "react/jsx-props-no-spreading": "off",
  },
  ignorePatterns: ["node_modules/", "lib/"],
};
