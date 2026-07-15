"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/use-active-project";
import { queryKeys } from "@/lib/queries/keys";

export interface ProjectListItem {
  id: number;
  name: string;
  url: string;
  scrapeStatus: string | null;
  industry: string | null;
}

interface ProjectListProps {
  projects: ProjectListItem[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/website-projects/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error((body as { error?: string }).error ?? "Failed to delete project");
      return;
    }

    if (activeProjectId === deleteTarget.id) {
      const remaining = projects.filter((p) => p.id !== deleteTarget.id);
      setActiveProjectId(remaining[0]?.id ?? null);
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.websiteProjects });
    toast.success("Project deleted");
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="paper-card p-5 flex items-center gap-4 hover:bg-secondary/20 transition-colors"
          >
            <Link href={`/projects/${project.id}`} className="flex flex-1 items-center gap-4 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{project.name}</p>
                  <Badge variant={project.scrapeStatus === "complete" ? "success" : "muted"} className="text-xs">
                    {project.scrapeStatus === "complete" ? "Ready" : project.scrapeStatus ?? "New"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{project.url}</p>
                {project.industry && (
                  <p className="text-xs text-muted-foreground mt-0.5">{project.industry}</p>
                )}
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              aria-label={`Delete ${project.name}`}
              onClick={() => setDeleteTarget(project)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span> and
              all associated content, roadmaps, and settings. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Spinner size="sm" className="border-white/30 border-t-white" /> Deleting…
                </>
              ) : (
                "Delete project"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
