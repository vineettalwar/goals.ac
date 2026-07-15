import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  CreateContentDialog,
  STUDIO_FORMAT_OPTIONS,
  StudioNewContentButton,
  StudioView,
  studioContentPiecePath,
  type CreateContentInitialValues,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useIntegrationsData } from "@/hooks/use-integrations-data";
import { useStudioData } from "@/hooks/use-studio-data";

const VALID_FORMATS = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));

function draftFromStudioSearchParams(
  searchParams: URLSearchParams,
): CreateContentInitialValues | null {
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const title = searchParams.get("title")?.trim() ?? "";
  const format = searchParams.get("format")?.trim() ?? "";
  const angle = searchParams.get("angle")?.trim() ?? "";
  const createFlag = searchParams.get("create") === "1";

  if (!keyword && !title && !createFlag) return null;

  return {
    title: title || keyword,
    targetKeyword: keyword || title,
    formatType: format && VALID_FORMATS.has(format as never) ? format : "blog_post",
    ...(angle ? { angleHint: angle } : {}),
  };
}

export function StudioPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId, activeProject, loading: projectsLoading, projects } = useActiveProject();
  const {
    loading,
    error,
    pieces,
    brandProfile,
    brandProfileLoading,
    aiReady,
    activeProvider,
    createPiece,
    deletePiece,
    markReady,
    reschedulePiece,
    deletingId,
    markingReadyId,
    reschedulingId,
  } = useStudioData(projectId || null);
  const { integrations } = useIntegrationsData(projectId || null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createInitialValues, setCreateInitialValues] =
    useState<CreateContentInitialValues | null>(null);

  const deepLinkDraft = useMemo(
    () => draftFromStudioSearchParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!deepLinkDraft) return;
    setCreateError(null);
    setCreateInitialValues(deepLinkDraft);
    setCreateOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("create");
        next.delete("keyword");
        next.delete("title");
        next.delete("format");
        next.delete("angle");
        return next;
      },
      { replace: true },
    );
  }, [deepLinkDraft, setSearchParams]);

  if (authLoading || !user || (projectsLoading && projects.length === 0)) {
    return (
      <p className="p-8 text-muted-foreground">
        {!authLoading && !user ? "Redirecting to sign in…" : "Loading…"}
      </p>
    );
  }

  const newContentAction = (
    <StudioNewContentButton
      onClick={() => {
        setCreateError(null);
        setCreateInitialValues(null);
        setCreateOpen(true);
      }}
    />
  );

  return (
    <>
      {error ? <p className="px-4 pt-8 text-sm text-red-700 sm:px-6 lg:px-8">{error}</p> : null}
      <StudioView
        projectId={projectId}
        projectName={activeProject?.name ?? null}
        pieces={pieces}
        loading={loading}
        brandProfile={brandProfile}
        brandProfileLoading={brandProfileLoading}
        aiReady={aiReady}
        activeProvider={activeProvider}
        newContentAction={newContentAction}
        onDeletePiece={deletePiece}
        onMarkReady={markReady}
        onReschedulePiece={reschedulePiece}
        deletingId={deletingId}
        markingReadyId={markingReadyId}
        reschedulingId={reschedulingId}
        renderLink={({ href, className, children, title }) => (
          <Link to={href} className={className} title={title}>
            {children}
          </Link>
        )}
      />
      <CreateContentDialog
        open={createOpen}
        initialValues={createInitialValues}
        cmsConnections={integrations ?? {}}
        onClose={() => {
          if (creating) return;
          setCreateOpen(false);
          setCreateInitialValues(null);
        }}
        submitting={creating}
        error={createError}
        onSubmit={async (input) => {
          setCreating(true);
          setCreateError(null);
          try {
            const piece = await createPiece(input);
            setCreateOpen(false);
            setCreateInitialValues(null);
            if (projectId && piece?.id) {
              navigate(studioContentPiecePath(projectId, piece.id));
            }
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
