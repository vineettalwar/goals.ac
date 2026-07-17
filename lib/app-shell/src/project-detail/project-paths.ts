/** Server-safe path helpers (no React / client deps). */

export function contentStudioPath(projectId: number | string): string {
  return `/projects/${projectId}/content-studio`;
}

export function projectIntegrationsPath(
  projectId: number | string,
  tab?: "cms" | "social" | "esp" | "search",
): string {
  if (tab) return `/projects/${projectId}/integrations/${tab}`;
  return `/projects/${projectId}/integrations`;
}

export function orgIntegrationsPath(tab?: "ai" | "tools"): string {
  if (tab) return `/integrations/${tab}`;
  return "/integrations";
}

export function contentPiecePath(
  projectId: number | string,
  pieceId: number | string,
): string {
  return `/projects/${projectId}/content-piece/${pieceId}`;
}
