import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreateContentDialog,
  StudioNewContentButton,
  StudioView,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useStudioData } from "@/hooks/use-studio-data";

export function StudioPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { projectId, activeProject, loading: projectsLoading } = useActiveProject();
  const { loading, error, pieces, createPiece } = useStudioData(projectId || null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  if (authLoading || projectsLoading) {
    return <p className="p-8 text-muted-foreground">Loading…</p>;
  }

  if (!user) {
    return null;
  }

  const newContentAction = (
    <StudioNewContentButton
      onClick={() => {
        setCreateError(null);
        setCreateOpen(true);
      }}
    />
  );

  return (
    <>
      {error ? <p className="px-8 pt-8 text-sm text-red-700">{error}</p> : null}
      <StudioView
        projectId={projectId}
        projectName={activeProject?.name ?? null}
        pieces={pieces}
        loading={loading}
        newContentAction={newContentAction}
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />
      <CreateContentDialog
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        submitting={creating}
        error={createError}
        onSubmit={async (input) => {
          setCreating(true);
          setCreateError(null);
          try {
            await createPiece(input);
            setCreateOpen(false);
          } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Failed to create content");
          } finally {
            setCreating(false);
          }
        }}
      />
    </>
  );
}
