import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
      "no-warning-comments": ["warn", { terms: ["todo", "fixme", "xxx"], location: "anywhere" }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unreachable": "error",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "docs/**", "test.js", "bin/**"],
  },
];
