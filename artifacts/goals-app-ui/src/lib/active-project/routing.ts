export function replaceProjectInPathname(pathname: string, newProjectId: number): string | null {
  const match = pathname.match(/^\/projects\/(\d+)(\/.*)?$/);
  if (!match) return null;
  const suffix = match[2] ?? "";
  return `/projects/${newProjectId}${suffix}`;
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
