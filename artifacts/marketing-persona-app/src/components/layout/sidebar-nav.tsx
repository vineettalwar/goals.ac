"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebarShell, projectIdFromPathname } from "@workspace/app-shell";
import { normalizeOrgRole } from "@/lib/org/org-access-shared";
import { ProjectSwitcher } from "@/components/projects/project-switcher";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/use-active-project";
import { useTheme } from "@/context/use-theme";
import { queryKeys } from "@/lib/queries/keys";
import {
  fetchGoals,
  fetchProjectContent,
  fetchRoadmapsCatalog,
  fetchTrackedKeywords,
  fetchVisibilitySummary,
  fetchWebsiteProject,
} from "@/lib/queries/fetchers";

interface SidebarNavProps {
  userName: string;
  userEmail: string;
  userRole?: string | null;
  orgRole?: string | null;
}

export function SidebarNav({ userName, userEmail, userRole, orgRole }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeProjectId } = useActiveProject();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const userImage = session?.user?.image;
  const normalizedOrgRole = normalizeOrgRole(orgRole);

  useEffect(() => {
    if (activeProjectId) {
      router.prefetch(`/projects/${activeProjectId}/content-studio`);
      router.prefetch(`/projects/${activeProjectId}/social`);
    }
  }, [activeProjectId, router]);

  const prefetchRouteData = useCallback(
    (href: string) => {
      router.prefetch(href);

      if (!activeProjectId) return;
      const projectId = String(activeProjectId);

      if (href.startsWith("/strategy/goals")) {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.goals(projectId),
          queryFn: () => fetchGoals(projectId),
        });
      } else if (href.startsWith("/search/performance")) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 27);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const qs = new URLSearchParams({ startDate: fmt(start), endDate: fmt(end) });
        void fetch(`/api/website-projects/${projectId}/article-performance?${qs}`);
      } else if (href.startsWith("/search/keywords") || href === "/search") {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.trackedKeywords(projectId),
          queryFn: () => fetchTrackedKeywords(projectId),
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.keywordOpportunities(projectId),
          queryFn: async () => {
            const res = await fetch(
              `/api/website-projects/${projectId}/keyword-opportunities?status=open`,
            );
            if (!res.ok) return [];
            const data = await res.json();
            return data.opportunities ?? [];
          },
        });
      } else if (href.startsWith("/strategy/roadmaps") || href === "/strategy") {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.projectContent(projectId),
          queryFn: () => fetchProjectContent(projectId),
        });
        void queryClient.prefetchQuery({
          queryKey: queryKeys.websiteProject(projectId),
          queryFn: () => fetchWebsiteProject(projectId),
        });
      } else if (href.startsWith("/search/visibility")) {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.visibilitySummary(projectId),
          queryFn: () => fetchVisibilitySummary(projectId),
        });
      } else if (href.startsWith("/audit")) {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.projectContent(projectId),
          queryFn: () => fetchProjectContent(projectId),
        });
      } else if (href.startsWith("/strategy/calendar")) {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.projectContent(projectId),
          queryFn: () => fetchProjectContent(projectId),
        });
      } else if (href.startsWith("/strategy/topical-map")) {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.roadmapsCatalog,
          queryFn: fetchRoadmapsCatalog,
        });
      }
    },
    [activeProjectId, queryClient, router],
  );

  return (
    <AppSidebarShell
      pathname={pathname}
      activeProjectId={activeProjectId ?? projectIdFromPathname(pathname)}
      userName={userName}
      userEmail={userEmail}
      userImage={userImage}
      userRole={userRole}
      orgRole={normalizedOrgRole ?? orgRole}
      theme={theme}
      onToggleTheme={toggleTheme}
      onSignOut={() => signOut({ callbackUrl: "/login" })}
      onNavIntent={prefetchRouteData}
      projectSwitcher={
        <Suspense
          fallback={
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Spinner size="sm" />
              <span className="text-xs text-muted-foreground">Loading projects…</span>
            </div>
          }
        >
          <ProjectSwitcher />
        </Suspense>
      }
      renderLink={({ href, className, children, onClick, onMouseEnter, onFocus }) => (
        <Link
          href={href}
          className={className}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onFocus={onFocus}
        >
          {children}
        </Link>
      )}
    />
  );
}
