"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Zap,
  FolderOpen,
  Map,
  BarChart2,
  Settings,
  LogOut,
  Leaf,
  Layers,
  Plug,
  Users,
  BookOpen,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "@/components/project-switcher";
import { useActiveProject } from "@/context/active-project";
import { queryKeys } from "@/lib/queries/keys";
import {
  fetchGoals,
  fetchProjectContent,
  fetchRoadmapsCatalog,
  fetchTrackedKeywords,
  fetchVisibilitySummary,
  fetchWebsiteProject,
} from "@/lib/queries/fetchers";

type NavItemDef = { label: string; href: string; icon: LucideIcon; matchPrefix?: string };

const NAV_SECTIONS: Array<{ label: string; items: NavItemDef[] }> = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Projects", href: "/projects", icon: FolderOpen },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Content Studio", href: "__content_studio__", icon: Layers },
      { label: "Autopilot", href: "/autopilot", icon: Zap },
    ],
  },
  {
    label: "Plan",
    items: [{ label: "Strategy", href: "/strategy", icon: Map, matchPrefix: "/strategy" }],
  },
  {
    label: "Measure",
    items: [
      { label: "Search", href: "/search", icon: BarChart2, matchPrefix: "/search" },
      { label: "GEO Audit", href: "/audit", icon: ScanSearch, matchPrefix: "/audit" },
    ],
  },
  {
    label: "Research",
    items: [{ label: "Research", href: "/research", icon: Users, matchPrefix: "/research" }],
  },
];

const FOOTER_ITEMS: NavItemDef[] = [
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Help", href: "/help", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface NavItemProps {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  onIntent?: () => void;
}

const NavItem = memo(function NavItem({ label, href, icon: Icon, active, onIntent }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        onMouseEnter={onIntent}
        onFocus={onIntent}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
        {label}
      </Link>
    </li>
  );
});

interface SidebarNavProps {
  userName: string;
  userEmail: string;
}

export function SidebarNav({ userName, userEmail }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeProjectId } = useActiveProject();

  function resolveHref(href: string) {
    if (href === "__content_studio__") {
      return activeProjectId ? `/projects/${activeProjectId}/content-studio` : "/projects";
    }
    return href;
  }

  function isActive(item: NavItemDef, resolvedHref: string) {
    if (item.label === "Content Studio") {
      return pathname.includes("/content-studio");
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
    if (item.label === "Projects") {
      return pathname === resolvedHref || pathname.startsWith("/projects/");
    }
    return pathname === resolvedHref || pathname.startsWith(`${resolvedHref}/`);
  }

  useEffect(() => {
    if (activeProjectId) {
      router.prefetch(`/projects/${activeProjectId}/content-studio`);
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
      } else if (href.startsWith("/search/keywords") || href === "/search") {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.trackedKeywords(projectId),
          queryFn: () => fetchTrackedKeywords(projectId),
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
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
          <Leaf className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">goals.ac</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-4 border-b border-border pb-3">
          <ProjectSwitcher />
        </div>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4 last:mb-0">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const resolvedHref = resolveHref(item.href);
                return (
                  <NavItem
                    key={item.label}
                    label={item.label}
                    href={resolvedHref}
                    icon={item.icon}
                    active={isActive(item, resolvedHref)}
                    onIntent={() => prefetchRouteData(resolvedHref)}
                  />
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-2 py-2">
        <ul className="space-y-0.5">
          {FOOTER_ITEMS.map((item) => {
            const resolvedHref = resolveHref(item.href);
            return (
              <NavItem
                key={item.label}
                label={item.label}
                href={resolvedHref}
                icon={item.icon}
                active={isActive(item, resolvedHref)}
                onIntent={() => prefetchRouteData(resolvedHref)}
              />
            );
          })}
        </ul>
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
