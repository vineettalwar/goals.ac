import type { QueryClient } from "@tanstack/react-query";

const PROJECT_SCOPED_ROOT_KEYS = new Set([
  "goals",
  "briefs",
  "tracked-keywords",
  "keyword-opportunities",
  "keyword-alerts",
  "keyword-snapshots",
  "project-content",
  "visibility-settings",
  "visibility-summary",
  "website-project",
]);

export function removeProjectScopedQueries(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) => {
      const root = query.queryKey[0];
      return typeof root === "string" && PROJECT_SCOPED_ROOT_KEYS.has(root);
    },
  });
}
