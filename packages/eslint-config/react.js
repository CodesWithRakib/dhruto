import globals from "globals";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import baseConfig from "./base.js";

export const reactConfig = [
  ...baseConfig,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default reactConfig;
