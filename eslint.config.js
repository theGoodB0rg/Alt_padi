import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  },
  {
    // Build and screenshot helpers run in Node, not the browser.
    files: ["scripts/**/*.{js,mjs,ts}"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } }
  },
  {
    ignores: ["dist", "node_modules", "coverage"]
  }
);
