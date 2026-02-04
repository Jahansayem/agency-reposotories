import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Coverage reports are generated files
    "coverage/**",
    // Hosting/build output directories
    ".netlify/**",
  ]),
  // Custom rules overrides
  {
    rules: {
      // Disable react-hooks rules that flag legitimate patterns like data loading in useEffect
      // and animation triggers. These are common React patterns that are intentional.
      "react-hooks/set-state-in-effect": "off",
      // Allow Date.now() and similar impure calls in useMemo - this is a common pattern
      // for calculating time-based values that should update when dependencies change
      "react-hooks/purity": "off",
      // Allow ref updates during render for the pattern of keeping refs in sync with props
      // This is a documented React pattern for avoiding stale closures in callbacks
      "react-hooks/refs": "off",
      // Allow unused variables that start with underscore (intentionally unused)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // The codebase and tests legitimately use `any` in boundary layers (e.g. JSON parsing,
      // third-party SDK types, or Playwright helpers). Keep it visible without failing CI.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Allow CommonJS-style scripts in the scripts/ folder (migration helpers, one-off tooling).
  {
    files: ["scripts/**/*.{js,cjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["tests/**/*.{js,cjs,mjs,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      // Playwright tests intentionally use mutable locals for readability.
      "prefer-const": "off",
      // Playwright fixtures use a `use(...)` callback that trips the React hook rule.
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);

export default eslintConfig;
