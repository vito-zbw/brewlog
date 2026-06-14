import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Playwright fixtures take a parameter conventionally named `use`,
    // which the React hooks rule misreads as a hook call.
    files: ["tests/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated test artifacts:
    "playwright-report/**",
    "test-results/**",
    // Harness-managed git worktrees live here — never lint a nested checkout
    // (its build output and tests aren't covered by this config's overrides).
    ".claude/**",
  ]),
]);

export default eslintConfig;
