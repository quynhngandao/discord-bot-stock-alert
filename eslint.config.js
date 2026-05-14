import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([
  globalIgnores([
    "**/eslint.config.js",
    "**/*.test.js",
    "**/*.spec.js",
    "**/*.integration.js",
    "**/*.bak.*",
    "**/test/**",
    "client/dist/*",
    "packages/*",
  ]),
  prettier,
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2024,
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: { ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);
