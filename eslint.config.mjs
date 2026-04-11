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
  ]),
  {
    rules: {
      // Catch forgotten console.logs (console.error/warn are allowed for API routes)
      "no-console": ["warn", { allow: ["error", "warn"] }],
      // Enforce strict TypeScript — no any escapes
      "@typescript-eslint/no-explicit-any": "error",
      // Unused variables are bugs
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Test scripts intentionally use console.log for output
    files: ["tests/**/*"],
    rules: {
      "no-console": "off",
    },
  },
]);

export default eslintConfig;
