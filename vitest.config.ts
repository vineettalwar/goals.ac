import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Four apps in this monorepo (goals-ac, goals-app-ui, marketing-persona-app,
 * mockup-sandbox) each define their own `@/*` -> `./src/*` path in tsconfig. A single
 * global vitest alias for `@` can only point at one of them, so it silently resolves
 * every other app's `@/` import to the wrong source tree instead of failing loudly —
 * confusing to debug, and exactly the ambiguity the org-access-invites test's own
 * comments flag as the reason it re-points specific imports by hand instead of
 * trusting an alias.
 *
 * This resolves `@/` relative to whichever `artifacts/<app>/src/` the importing file
 * actually lives under, so each app's tests get their own app's source tree and nothing
 * has to special-case its imports to work around a shared alias.
 */
function appScopedAtAlias(): Plugin {
  const appsRoot = path.resolve(__dirname, "artifacts");
  return {
    name: "app-scoped-at-alias",
    resolveId(source, importer) {
      if (!source.startsWith("@/") || !importer) return null;
      const match = importer.replace(/\\/g, "/").match(/\/artifacts\/([^/]+)\/src\//);
      if (!match) return null;
      return this.resolve(path.join(appsRoot, match[1], "src", source.slice(2)), importer, {
        skipSelf: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [appScopedAtAlias()],
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
