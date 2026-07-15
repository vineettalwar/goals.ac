import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  briefToCreateContentInitialValues,
  CreateContentDialog,
  flattenCompetitorAnalysisList,
  STUDIO_FORMAT_OPTIONS,
  StudioNewContentButton,
  StudioView,
  studioContentPiecePath,
  type BriefDraftSource,
  type CreateCompetitorOption,
  type CreateContentInitialValues,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useIntegrationsData } from "@/hooks/use-integrations-data";
import {
  useStudioData,
  type CreateStreamProgress,
} from "@/hooks/use-studio-data";
import { apiFetch } from "@/lib/api";
import {
  fetchCompetitorContext,
  type CompetitorContextResponse,
} from "@/lib/queries/fetchers";

const VALID_FORMATS = new Set(STUDIO_FORMAT_OPTIONS.map((option) => option.value));

function hostnameKey(url: string): string {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function buildCreateCompetitors(
  ctx: CompetitorContextResponse | null | undefined,
): CreateCompetitorOption[] {
  if (!ctx) return [];
  const byHost = new Map<string, CreateCompetitorOption>();
  for (const analysis of flattenCompetitorAnalysisList(ctx)) {
    const url = analysis.competitorUrl?.trim();
    if (!url) continue;
    byHost.set(hostnameKey(url), {
      url,
      name: analysis.competitorName,
      summary: analysis.summary,
      threatLevel: analysis.threatLevel,
      contentGaps: analysis.contentGaps,
    });
  }
  for (const raw of ctx.competitorUrls ?? []) {
    const url = raw.trim();
    if (!url) continue;
    const key = hostnameKey(url);
    if (!byHost.has(key)) byHost.set(key, { url });
  }
  return Array.from(byHost.values()).slice(0, 5);
}

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
    repurposePiece,
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
  const [streamProgress, setStreamProgress] = useState<CreateStreamProgress | null>(null);
  const [createInitialValues, setCreateInitialValues] =
    useState<CreateContentInitialValues | null>(null);

  const competitorQuery = useQuery({
    queryKey: ["competitor-context", projectId],
    queryFn: () => fetchCompetitorContext(projectId!),
    enabled: Boolean(projectId && createOpen),
    staleTime: 30_000,
  });

  const projectCompetitors = useMemo(
    () => buildCreateCompetitors(competitorQuery.data),
    [competitorQuery.data],
  );

  const deepLinkDraft = useMemo(
    () => draftFromStudioSearchParams(searchParams),
    [searchParams],
  );
  const briefIdParam = searchParams.get("briefId");

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

  // Create-from-brief deep link (?briefId=N), mirrors Next `/content-studio?briefId=`.
  useEffect(() => {
    if (!briefIdParam) return;
    const clearParam = () =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("briefId");
          return next;
        },
        { replace: true },
      );

    const briefId = Number(briefIdParam);
    if (!Number.isFinite(briefId) || briefId <= 0) {
      clearParam();
      return;
    }

    let cancelled = false;
    void apiFetch<BriefDraftSource>(`/api/briefs/${briefId}`)
      .then((brief) => {
        if (cancelled) return;
        setCreateError(null);
        setCreateInitialValues(briefToCreateContentInitialValues(brief));
        setCreateOpen(true);
      })
      .catch(() => {
        // Invalid or inaccessible brief — skip silently, don't block the page.
      })
      .finally(() => {
        if (!cancelled) clearParam();
      });
    return () => {
      cancelled = true;
    };
  }, [briefIdParam, setSearchParams]);

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
        projectCompetitors={projectCompetitors}
        competitorsLoading={competitorQuery.isPending && !competitorQuery.data}
        generatingPhase={creating ? (streamProgress?.phase ?? "analyzing") : null}
        generatingHeadings={creating ? (streamProgress?.sections ?? null) : null}
        existingPieces={pieces.map((piece) => ({
          id: piece.id,
          title: piece.title,
          targetKeyword: piece.targetKeyword,
          formatType: piece.formatType,
        }))}
        onLoadSourcePiece={async (pieceId) => {
          const row = await apiFetch<{ bodyMarkdown?: string; targetKeyword?: string | null }>(
            `/api/content-pieces/${pieceId}`,
          );
          return {
            bodyMarkdown: row.bodyMarkdown ?? "",
            targetKeyword: row.targetKeyword ?? null,
          };
        }}
        onClose={() => {
          if (creating) return;
          setCreateOpen(false);
          setCreateInitialValues(null);
          setStreamProgress(null);
        }}
        submitting={creating}
        error={createError}
        onRepurpose={async (input) => {
          setCreating(true);
          setCreateError(null);
          setStreamProgress({ phase: "analyzing" });
          try {
            const piece = await repurposePiece(input);
            setCreateOpen(false);
            setCreateInitialValues(null);
            setStreamProgress(null);
            if (projectId && piece?.id) {
              navigate(studioContentPiecePath(projectId, piece.id));
            }
          } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Failed to repurpose content");
            setStreamProgress(null);
          } finally {
            setCreating(false);
          }
        }}
        onSubmit={async (input) => {
          setCreating(true);
          setCreateError(null);
          setStreamProgress({ phase: "analyzing" });
          try {
            const piece = await createPiece(input, {
              onProgress: (progress) => setStreamProgress(progress),
            });
            setCreateOpen(false);
            setCreateInitialValues(null);
            setStreamProgress(null);
            if (projectId && piece?.id) {
              navigate(studioContentPiecePath(projectId, piece.id));
            }
          } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Failed to create content");
            setStreamProgress(null);
          } finally {
            setCreating(false);
          }
        }}
      />
    </>
  );
}
