import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [
      js.configs.recommended,
      "plugin:react/recommended",          // React recommended rules
      ...tseslint.configs.recommended,
      "plugin:react/jsx-runtime"          // Use new JSX runtime
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      react: js.plugins.react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Disable need to import React in scope for JSX
      "react/react-in-jsx-scope": "off",
      // Inherit recommended React Hooks rules
      ...reactHooks.configs.recommended.rules,
      // Only export React components rule
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true }
      ],
      // Disable base ESLint no-unused-vars
      "no-unused-vars": "off",
      // TS rule: ignore React import and underscore vars
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^(React|_)",
          argsIgnorePattern: "^_"
        }
      ]
    }
  }
);
