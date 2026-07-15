import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ProjectsView,
  TeamManagementView,
  projectDetailPath,
  type ProjectListItem,
} from "@workspace/app-shell";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { NewProjectButton } from "@/components/NewProjectButton";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useProjectsData } from "@/hooks/use-projects-data";
import { useTeamData } from "@/hooks/use-team-data";

export function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { loading, error, projects, quotaLabel, reload } = useProjectsData();
  const {
    canManageTeam,
    members,
    loading: teamLoading,
    error: teamError,
    submitting: teamSubmitting,
    addMember,
    updateMember,
    removeMember,
  } = useTeamData();
  const { projectId, setProjectId } = useActiveProject();
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  if ((authLoading && !user) || (loading && projects.length === 0)) {
    return <p className="p-8 text-muted-foreground">Loading…</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      {error ? <p className="px-8 pt-8 text-sm text-red-700">{error}</p> : null}
      {canManageTeam ? (
        <div className="px-8 pt-8 max-w-5xl">
          <TeamManagementView
            members={members}
            projects={projects}
            loading={teamLoading && members.length === 0}
            error={teamError}
            submitting={teamSubmitting}
            onAddMember={addMember}
            onUpdateMember={(member, role, assignedProjectId) =>
              updateMember(member.userId, role, assignedProjectId)
            }
            onRemoveMember={(member) => {
              if (!window.confirm(`Remove ${member.email} from the organization?`)) {
                return Promise.resolve();
              }
              return removeMember(member.userId);
            }}
          />
        </div>
      ) : null}
      <ProjectsView
        quotaLabel={quotaLabel}
        projects={projects}
        newProjectAction={
          <NewProjectButton
            onCreated={(project) => {
              void reload();
              navigate(projectDetailPath(project.id));
            }}
          />
        }
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
        onDeleteProject={setDeleteTarget}
      />
      <DeleteProjectDialog
        project={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          if (deleteTarget && String(deleteTarget.id) === projectId) {
            const remaining = projects.filter((row) => row.id !== deleteTarget.id);
            const next = remaining[0];
            if (next) setProjectId(String(next.id));
          }
          void reload();
        }}
      />
    </>
  );
}

export type { ContentPiece, WebsiteProject } from "@/types/api";
