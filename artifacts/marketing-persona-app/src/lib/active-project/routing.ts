export function replaceProjectInPathname(pathname: string, newProjectId: number): string | null {
  const match = pathname.match(/^\/projects\/(\d+)(\/.*)?$/);
  if (!match) return null;
  const suffix = match[2] ?? "";
  // Piece IDs are project-scoped; land on studio instead of a foreign piece.
  if (suffix.startsWith("/content-piece/")) {
    return `/projects/${newProjectId}/content-studio`;
  }
  return `/projects/${newProjectId}${suffix}`;
}

/** Create/brief/optimize deep links belong to one project — drop on switch. */
const PROJECT_SCOPED_SEARCH_KEYS = [
  "create",
  "keyword",
  "title",
  "angle",
  "format",
  "briefId",
  "optimize",
  "url",
  "project",
] as const;

export function queryStringForProjectSwitch(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of PROJECT_SCOPED_SEARCH_KEYS) {
    params.delete(key);
  }
  return params.toString();
}

export function navigationTargetForActiveProject(
  pathname: string,
  newProjectId: number,
): string | null {
  const replaced = replaceProjectInPathname(pathname, newProjectId);
  if (replaced) return replaced;

  if (pathname === "/projects") {
    return `/projects/${newProjectId}`;
  }

  return null;
}
