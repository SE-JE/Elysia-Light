import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tsParser from "@typescript-eslint/parser"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import prettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("prettier"),
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any"        :  0,
      "no-console"                                :  1,
      "no-nested-ternary"                         :  0,
      "@typescript-eslint/no-unused-expressions"  :  0,
      "@typescript-eslint/no-array-constructor"   :  0,
    },
  },
  prettier,
];

export default eslintConfig;
