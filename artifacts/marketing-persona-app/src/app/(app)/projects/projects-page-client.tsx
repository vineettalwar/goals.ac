"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProjectsView, type ProjectListItem } from "@workspace/app-shell/projects";
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
import { NewProjectButton } from "./new-project-button";

type ProjectsPageClientProps = {
  projects: ProjectListItem[];
  quotaLabel: string | null;
};

export function ProjectsPageClient({ projects, quotaLabel }: ProjectsPageClientProps) {
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
      const remaining = projects.filter((project) => project.id !== deleteTarget.id);
      setActiveProjectId(remaining[0]?.id ?? null);
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.websiteProjects });
    toast.success("Project deleted");
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <>
      <ProjectsView
        quotaLabel={quotaLabel}
        projects={projects}
        newProjectAction={<NewProjectButton />}
        renderLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
        onDeleteProject={setDeleteTarget}
      />

      <Dialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span> and all
              associated content, roadmaps, and settings. This cannot be undone.
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
