import { defineConfig } from "vitest/config";

export default defineConfig({
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
