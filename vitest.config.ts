import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the `@/*` path in artifacts/marketing-persona-app/tsconfig.json.
      // Without it, any tested module that reaches into the app through `@/` resolves
      // under tsc but fails at run time, which reads as a broken test rather than a
      // missing alias.
      "@": path.resolve(__dirname, "artifacts/marketing-persona-app/src"),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "artifacts/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    environment: "node",
    restoreMocks: true,
    coverage: {
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
    },
  },
});
