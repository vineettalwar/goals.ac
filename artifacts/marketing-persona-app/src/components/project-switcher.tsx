"use client";

import Link from "next/link";
import { Globe, Plus } from "lucide-react";
import { useActiveProject } from "@/context/active-project";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ProjectSwitcher({ className }: { className?: string }) {
  const { projects, activeProjectId, activeProject, setActiveProjectId, isLoading } =
    useActiveProject();

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
        <Link
          href="/projects"
          className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add a website
        </Link>
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
        onValueChange={(value) => setActiveProjectId(Number.parseInt(value, 10))}
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
        <SelectContent align="start" className="w-[var(--radix-select-trigger-width)]">
          {projects.map((project) => (
            <SelectItem key={project.id} value={String(project.id)} className="py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">{hostname(project.url)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link
        href="/projects"
        className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Manage projects
      </Link>
    </div>
  );
}
