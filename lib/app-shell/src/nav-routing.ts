export function projectIdFromPathname(pathname: string): number | null {
  const match = pathname.match(/^\/projects\/(\d+)(?:\/|$)/);
  if (!match) return null;
  const id = Number.parseInt(match[1]!, 10);
  return Number.isFinite(id) ? id : null;
}

export function resolveNavHref(
  pathname: string,
  activeProjectId: number | null,
  href: string,
): string {
  const projectId = projectIdFromPathname(pathname) ?? activeProjectId;
  if (href === "__content_studio__") {
    return projectId ? `/projects/${projectId}/content-studio` : "/projects";
  }
  if (href === "__social_hub__") {
    return projectId ? `/projects/${projectId}/social` : "/projects";
  }
  if (href === "__autopilot__") {
    return projectId ? `/projects/${projectId}?tab=automation` : "/projects";
  }
  return href;
}

export function isNavItemActive(
  pathname: string,
  item: { label: string; href: string; matchPrefix?: string },
  resolvedHref: string,
): boolean {
  if (item.label === "Content Studio") {
    return pathname.includes("/content-studio") || pathname.startsWith("/studio");
  }
  if (item.label === "Social Hub") {
    return pathname.includes("/social");
  }
  if (item.label === "Autopilot") {
    return (
      pathname.includes("tab=automation") ||
      pathname.includes("tab=publishing") ||
      pathname.startsWith("/autopilot")
    );
  }
  if (item.matchPrefix) {
    if (item.matchPrefix === "/strategy") {
      return (
        pathname === item.matchPrefix ||
        pathname.startsWith(`${item.matchPrefix}/`) ||
        pathname.startsWith("/growth-roadmaps") ||
        pathname.startsWith("/content-strategy")
      );
    }
    if (item.matchPrefix === "/search") {
      return (
        (pathname === "/search" || pathname.startsWith("/search/")) &&
        !pathname.startsWith("/search/geo-audit")
      );
    }
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
  }
  if (item.label === "Partner") {
    return pathname === "/partner" || pathname.startsWith("/partner/");
  }
  if (item.label === "Integrations") {
    return pathname === "/integrations" || pathname.startsWith("/integrations/");
  }
  if (item.label === "Projects") {
    return pathname === resolvedHref || pathname.startsWith("/projects/");
  }
  if (item.label === "Admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }
  return pathname === resolvedHref || pathname.startsWith(`${resolvedHref}/`);
}
