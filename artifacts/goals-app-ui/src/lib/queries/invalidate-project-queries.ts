import type { QueryClient } from "@tanstack/react-query";

const PROJECT_SCOPED_ROOT_KEYS = new Set([
  "dashboard",
  "studio",
  "content-pieces",
  "integrations",
  "autopilot",
  "audit-list",
  "social",
  "goals",
  "brand-keywords",
  "tracked-keywords",
  "visibility-settings",
  "keyword-opportunities",
  "competitor-analyses",
  "help-checklist",
  "project-detail",
  "content-piece",
]);

export function removeProjectScopedQueries(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) => {
      const root = query.queryKey[0];
      return typeof root === "string" && PROJECT_SCOPED_ROOT_KEYS.has(root);
    },
  });
}
