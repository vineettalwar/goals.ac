"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Globe, Plus } from "lucide-react";
import { useActiveProject } from "@/context/active-project";
import { navigationTargetForActiveProject } from "@/lib/active-project/routing";
import { NewProjectDialog } from "@/components/new-project-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const ADD_PROJECT_VALUE = "__add_project__";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isPlatformAdmin(role: string | undefined) {
  return role === "super_admin" || role === "admin";
}

export function ProjectSwitcher({ className }: { className?: string }) {
  const { data: session } = useSession();
  const {
    projects,
    activeProjectId,
    activeProject,
    setActiveProjectId,
    refreshProjects,
    isLoading,
  } = useActiveProject();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const orgRole = session?.user?.orgRole;
  const platformRole = session?.user?.role;
  const isScopedMember =
    (orgRole === "editor" || orgRole === "viewer") && !isPlatformAdmin(platformRole);
  const canManageProjects =
    orgRole === "site_admin" || orgRole === "owner" || isPlatformAdmin(platformRole);

  function selectProject(projectId: number) {
    setActiveProjectId(projectId);

    const target = navigationTargetForActiveProject(pathname, projectId);
    if (target) {
      const query = searchParams.toString();
      router.push(query ? `${target}?${query}` : target);
      return;
    }

    if (pathname === "/dashboard") {
      router.refresh();
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2.5", className)}>
        <Spinner size="sm" />
        <span className="text-xs text-muted-foreground">Loading projects…</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={cn("px-3 py-2.5", className)}>
        <p className="text-xs font-medium text-foreground">No projects yet</p>
        {canManageProjects && (
          <Link
            href="/projects"
            className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add a website
          </Link>
        )}
      </div>
    );
  }

  if (isScopedMember) {
    const project = activeProject ?? projects[0];
    if (!project) return null;

    return (
      <div className={cn("px-3 py-2.5", className)}>
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your site
        </p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-2.5 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background border border-border">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{project.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{hostname(project.url)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("px-3 py-2.5", className)}>
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Active project
      </p>
      <Select
        value={activeProjectId != null ? String(activeProjectId) : undefined}
        onValueChange={(value) => {
          if (value === ADD_PROJECT_VALUE) {
            setAddDialogOpen(true);
            return;
          }
          selectProject(Number.parseInt(value, 10));
        }}
      >
        <SelectTrigger className="h-auto w-full gap-2 border-border bg-secondary/50 px-2.5 py-2 text-left shadow-none [&>svg:last-child]:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background border border-border">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-medium">{activeProject?.name ?? "Select project"}</p>
              {activeProject ? (
                <p className="truncate text-[10px] text-muted-foreground">{hostname(activeProject.url)}</p>
              ) : (
                <SelectValue placeholder="Select project" />
              )}
            </div>
          </div>
        </SelectTrigger>
        <SelectContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-(--radix-select-trigger-width)"
        >
          {projects.map((project) => (
            <SelectItem key={project.id} value={String(project.id)} className="py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{hostname(project.url)}</span>
              </div>
            </SelectItem>
          ))}
          <SelectSeparator />
          {canManageProjects && (
            <SelectItem value={ADD_PROJECT_VALUE} className="py-2 text-primary focus:text-primary">
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5" />
                Add project
              </span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {canManageProjects && (
        <Link
          href="/projects"
          className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage projects
        </Link>
      )}
      <NewProjectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onCreated={async (project) => {
          await refreshProjects();
          selectProject(project.id);
        }}
      />
    </div>
  );
}
