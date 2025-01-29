import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */

export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    env: {
      node: true,
      es2021: true
    },
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "airbnb-base"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: 12,
      sourceType: "module"
    },
    plugins: [
      "@typescript-eslint"
    ],
    rules: {
      "import/extensions": "off",
      "import/no-unresolved": "off",
      "no-console": "off",
      "class-methods-use-this": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];