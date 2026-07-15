import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, API_FETCH_AI_TIMEOUT_MS } from "@/lib/api";
import { fetchStockCredentialsStatus, isStockImagesConfigured } from "@/lib/queries/fetchers";
import { queryKeys } from "@/lib/queries/keys";
import type {
  ContentPieceDetail,
  ContentPieceGeneratingState,
  ContentPieceMetadata,
  ContentPiecePublishingState,
  PublishDestinationId,
} from "@workspace/app-shell";
import type { ContentPiece } from "@/types/api";

const JOB_POLL_MS = 2000;
const PIECE_POLL_MS = 3000;
const TERMINAL_JOB_STATUSES = new Set(["completed", "failed"]);

type AcceptedGenerateResponse = {
  accepted?: boolean;
  jobId?: string;
  queue?: string;
  status?: string;
  contentPieceId?: number;
};

type AcceptedPublishResponse = {
  accepted?: boolean;
  jobId?: string;
  queue?: string;
  status?: string;
};

type JobStatusResponse = {
  jobId: string;
  status: string;
  queue?: string;
  error?: string;
  message?: string;
  updatedAt?: string;
};

type HumanizeResponse = ContentPiece & {
  humanized?: boolean;
  audit?: {
    slopScoreBefore?: number;
    slopScoreAfter?: number;
    rejected?: boolean;
  };
  pieceMetadata?: {
    humanizationAudit?: {
      slopScoreBefore?: number;
      slopScoreAfter?: number;
      rejected?: boolean;
    };
  };
};

function mapPiece(piece: ContentPiece): ContentPieceDetail {
  return {
    id: piece.id,
    websiteProjectId: piece.websiteProjectId,
    title: piece.title,
    status: piece.status,
    formatType: piece.formatType,
    wordCount: piece.wordCount,
    targetKeyword: piece.targetKeyword ?? null,
    plannedDate: piece.plannedDate ?? null,
    updatedAt: piece.updatedAt,
    bodyMarkdown: piece.bodyMarkdown ?? null,
    pieceMetadata: (piece.pieceMetadata as ContentPieceMetadata | null | undefined) ?? null,
  };
}

function isTerminalJobStatus(status: string | undefined): boolean {
  return status != null && TERMINAL_JOB_STATUSES.has(status);
}

type ContentPieceCache = {
  piece: ContentPieceDetail | null;
  notFound: boolean;
};

async function fetchContentPieceCache(pieceId: string): Promise<ContentPieceCache> {
  try {
    const row = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}`);
    return { piece: mapPiece(row), notFound: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load content piece";
    if (message.toLowerCase().includes("not found")) {
      return { piece: null, notFound: true };
    }
    throw err;
  }
}

export function useContentPieceData(pieceId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.contentPiece(pieceId),
    queryFn: () => fetchContentPieceCache(pieceId!),
    enabled: Boolean(pieceId),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const stockQuery = useQuery({
    queryKey: queryKeys.stockCredentials,
    queryFn: fetchStockCredentialsStatus,
    staleTime: 120_000,
  });

  const piece = query.data?.piece ?? null;
  const notFound = query.data?.notFound ?? false;
  const loading = query.isPending && !query.data;
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishingState, setPublishingState] = useState<ContentPiecePublishingState | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [generatingState, setGeneratingState] = useState<ContentPieceGeneratingState | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [humanizing, setHumanizing] = useState(false);
  const [humanizeMessage, setHumanizeMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateMessage, setRegenerateMessage] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceMessage, setEnhanceMessage] = useState<string | null>(null);
  const [regeneratingImages, setRegeneratingImages] = useState(false);
  const generateJobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const publishJobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopGenerateJobPoll = useCallback(() => {
    if (generateJobPollRef.current) {
      clearInterval(generateJobPollRef.current);
      generateJobPollRef.current = null;
    }
  }, []);

  const stopPublishJobPoll = useCallback(() => {
    if (publishJobPollRef.current) {
      clearInterval(publishJobPollRef.current);
      publishJobPollRef.current = null;
    }
  }, []);

  const setCachedPiece = useCallback(
    (next: ContentPieceDetail | null) => {
      if (!pieceId) return;
      queryClient.setQueryData<ContentPieceCache>(queryKeys.contentPiece(pieceId), {
        piece: next,
        notFound: false,
      });
    },
    [pieceId, queryClient],
  );

  const loadPiece = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!pieceId) return null;
      try {
        const row = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}`);
        const mapped = mapPiece(row);
        setCachedPiece(mapped);
        setError(null);
        if (mapped.status !== "generating") {
          setGeneratingState(null);
          stopGenerateJobPoll();
        }
        if (mapped.status === "published") {
          setPublishingState(null);
          stopPublishJobPoll();
        }
        return mapped;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load content piece";
        if (message.toLowerCase().includes("not found")) {
          queryClient.setQueryData<ContentPieceCache>(queryKeys.contentPiece(pieceId), {
            piece: null,
            notFound: true,
          });
        } else if (!options?.silent) {
          setError(message);
        }
        return null;
      }
    },
    [pieceId, stopGenerateJobPoll, stopPublishJobPoll, setCachedPiece, queryClient],
  );

  const load = useCallback(async () => {
    await loadPiece();
  }, [loadPiece]);

  useEffect(() => {
    if (!pieceId) return;
    setError(null);
  }, [pieceId]);

  const pollGenerateJobOnce = useCallback(
    async (jobId: string) => {
      try {
        const status = await apiFetch<JobStatusResponse>(
          `/api/jobs/${encodeURIComponent(jobId)}`,
        );
        const jobStatus = status.status ?? "pending";

        setGeneratingState((prev) => ({
          message: prev?.message ?? "Generating content…",
          jobId,
          jobStatus,
        }));

        if (isTerminalJobStatus(jobStatus)) {
          stopGenerateJobPoll();
          setGenerating(false);
          const refreshed = await loadPiece({ silent: true });
          if (jobStatus === "completed") {
            setGeneratingState(null);
            setGenerateMessage("Content generation complete.");
          } else {
            setGeneratingState(null);
            setGenerateMessage(
              status.error ?? status.message ?? "Content generation failed.",
            );
          }
        }
      } catch {
        // Ignore transient poll errors; piece polling covers completion.
      }
    },
    [loadPiece, stopGenerateJobPoll],
  );

  const startGenerateJobPoll = useCallback(
    (jobId: string) => {
      stopGenerateJobPoll();
      void pollGenerateJobOnce(jobId);
      generateJobPollRef.current = setInterval(() => {
        void pollGenerateJobOnce(jobId);
      }, JOB_POLL_MS);
    },
    [pollGenerateJobOnce, stopGenerateJobPoll],
  );

  const pollPublishJobOnce = useCallback(
    async (jobId: string, platform: PublishDestinationId) => {
      try {
        const status = await apiFetch<JobStatusResponse>(
          `/api/jobs/${encodeURIComponent(jobId)}`,
        );
        const jobStatus = status.status ?? "pending";

        setPublishingState((prev) => ({
          message: prev?.message ?? `Publishing to ${platform}…`,
          jobId,
          jobStatus,
          platform,
        }));

        if (isTerminalJobStatus(jobStatus)) {
          stopPublishJobPoll();
          const refreshed = await loadPiece({ silent: true });
          if (jobStatus === "completed" || refreshed?.status === "published") {
            setPublishMessage(`Published to ${platform}.`);
            setPublishingState(null);
          } else {
            setPublishMessage(status.error ?? status.message ?? "Publish failed.");
            setPublishingState(null);
          }
        }
      } catch {
        // Ignore transient poll errors; piece polling covers completion.
      }
    },
    [loadPiece, stopPublishJobPoll],
  );

  const startPublishJobPoll = useCallback(
    (jobId: string, platform: PublishDestinationId) => {
      stopPublishJobPoll();
      void pollPublishJobOnce(jobId, platform);
      publishJobPollRef.current = setInterval(() => {
        void pollPublishJobOnce(jobId, platform);
      }, JOB_POLL_MS);
    },
    [pollPublishJobOnce, stopPublishJobPoll],
  );

  useEffect(
    () => () => {
      stopGenerateJobPoll();
      stopPublishJobPoll();
    },
    [stopGenerateJobPoll, stopPublishJobPoll],
  );

  useEffect(() => {
    if (!pieceId || piece?.status !== "generating") return;

    const interval = setInterval(() => {
      void loadPiece({ silent: true });
    }, PIECE_POLL_MS);

    return () => clearInterval(interval);
  }, [pieceId, piece?.status, loadPiece]);

  const staleGenerating =
    piece?.status === "generating" && !generating && !generatingState?.jobId;

  const resetToDraft = useCallback(async () => {
    if (!pieceId) return;
    setGenerateMessage(null);
    setGeneratingState(null);
    try {
      const updated = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      setCachedPiece(mapPiece(updated));
    } catch (err) {
      setGenerateMessage(err instanceof Error ? err.message : "Failed to reset content piece");
    }
  }, [pieceId]);

  useEffect(() => {
    if (!pieceId || !publishingState) return;

    const interval = setInterval(() => {
      void loadPiece({ silent: true });
    }, PIECE_POLL_MS);

    return () => clearInterval(interval);
  }, [pieceId, publishingState, loadPiece]);

  const generate = useCallback(async () => {
    if (!pieceId || !piece) return;
    setGenerating(true);
    setGenerateMessage(null);
    try {
      const response = await apiFetch<AcceptedGenerateResponse>(
        `/api/content-pieces/${pieceId}/generate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const jobId = response.jobId;
      setGeneratingState({
        message: "Generating content…",
        jobId: jobId ?? null,
        jobStatus: response.status ?? "queued",
      });
      if (piece) {
        setCachedPiece({ ...piece, status: "generating" });
      }
      if (jobId) {
        startGenerateJobPoll(jobId);
      } else {
        setGenerateMessage("Generate job queued. Content will update when complete.");
      }
    } catch (err) {
      setGeneratingState(null);
      setGenerateMessage(
        err instanceof Error ? err.message : "Failed to queue generate job",
      );
    } finally {
      setGenerating(false);
    }
  }, [pieceId, piece, startGenerateJobPoll]);

  const save = useCallback(
    async (payload: {
      title: string;
      bodyMarkdown: string;
      status?: "draft" | "ready";
      plannedDate?: string | null;
    }) => {
      if (!pieceId || !piece) return;
      setSaving(true);
      setSaveMessage(null);
      try {
        const updated = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: payload.title,
            bodyMarkdown: payload.bodyMarkdown,
            ...(payload.status ? { status: payload.status } : {}),
            ...(payload.plannedDate !== undefined ? { plannedDate: payload.plannedDate } : {}),
          }),
        });
        setCachedPiece(mapPiece(updated));
        setSaveMessage("Saved.");
      } catch (err) {
        setSaveMessage(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [pieceId, piece, setCachedPiece],
  );

  const deletePiece = useCallback(async () => {
    if (!pieceId || !piece) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/content-pieces/${pieceId}`, { method: "DELETE" });
      queryClient.removeQueries({ queryKey: queryKeys.contentPiece(pieceId) });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.contentPieces(String(piece.websiteProjectId)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete content piece");
      throw err;
    } finally {
      setDeleting(false);
    }
  }, [pieceId, piece, queryClient]);

  const markReady = useCallback(async () => {
    if (!pieceId || !piece) return;
    setMarkingReady(true);
    setSaveMessage(null);
    try {
      const updated = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
      setCachedPiece(mapPiece(updated));
      setSaveMessage("Marked ready.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to mark ready");
      throw err;
    } finally {
      setMarkingReady(false);
    }
  }, [pieceId, piece, setCachedPiece]);

  const regenerate = useCallback(async () => {
    if (!pieceId || !piece) return;
    if (!window.confirm("Regenerate will replace the current draft. Continue?")) return;
    setRegenerating(true);
    setRegenerateMessage(null);
    try {
      const updated = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}/regenerate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
        timeoutMs: API_FETCH_AI_TIMEOUT_MS,
      });
      setCachedPiece(mapPiece(updated));
      setRegenerateMessage("Content regenerated.");
    } catch (err) {
      setRegenerateMessage(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }, [pieceId, piece, setCachedPiece]);

  const enhance = useCallback(async () => {
    if (!pieceId || !piece) return;
    setEnhancing(true);
    setEnhanceMessage(null);
    try {
      const updated = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}/enhance`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        timeoutMs: API_FETCH_AI_TIMEOUT_MS,
      });
      setCachedPiece(mapPiece(updated));
      setEnhanceMessage("Quality enhanced.");
    } catch (err) {
      setEnhanceMessage(err instanceof Error ? err.message : "Enhancement failed");
    } finally {
      setEnhancing(false);
    }
  }, [pieceId, piece, setCachedPiece]);

  const repurpose = useCallback(
    async (targetFormat: string) => {
      if (!pieceId || !piece) throw new Error("Content piece not loaded");
      const inserted = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}/repurpose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetFormat }),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.contentPieces(String(piece.websiteProjectId)),
      });
      return { id: inserted.id };
    },
    [pieceId, piece, queryClient],
  );

  const regenerateImages = useCallback(async () => {
    if (!pieceId || !piece) return;
    setRegeneratingImages(true);
    try {
      const response = await apiFetch<{ piece: ContentPiece }>(
        `/api/content-pieces/${pieceId}/images/regenerate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
        },
      );
      setCachedPiece(mapPiece(response.piece));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image regeneration failed");
      throw err;
    } finally {
      setRegeneratingImages(false);
    }
  }, [pieceId, piece, setCachedPiece]);

  const humanize = useCallback(async () => {
    if (!pieceId || !piece) return;
    setHumanizing(true);
    setHumanizeMessage(null);
    try {
      const updated = await apiFetch<HumanizeResponse>(
        `/api/content-pieces/${pieceId}/humanize`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          timeoutMs: API_FETCH_AI_TIMEOUT_MS,
        },
      );
      setCachedPiece(mapPiece(updated));
      const audit = updated.audit ?? updated.pieceMetadata?.humanizationAudit;
      if (audit?.rejected) {
        setHumanizeMessage("Humanization skipped — structure preserved.");
      } else if (updated.humanized) {
        setHumanizeMessage(
          audit?.slopScoreBefore != null && audit?.slopScoreAfter != null
            ? `Humanized — AI tells ${audit.slopScoreBefore} → ${audit.slopScoreAfter}`
            : "Humanized.",
        );
      } else {
        setHumanizeMessage("No changes needed — draft already reads naturally.");
      }
    } catch (err) {
      setHumanizeMessage(err instanceof Error ? err.message : "Humanization failed");
    } finally {
      setHumanizing(false);
    }
  }, [pieceId, piece]);

  const publishToDestination = useCallback(
    async (platform: PublishDestinationId) => {
      if (!pieceId || !piece) return;
      setPublishing(true);
      setPublishMessage(null);
      try {
        const response = await apiFetch<AcceptedPublishResponse>(
          `/api/content-pieces/${pieceId}/publish`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contentPieceId: piece.id,
              platform,
            }),
          },
        );
        const jobId = response.jobId;
        setPublishingState({
          message: `Publishing to ${platform}…`,
          jobId: jobId ?? null,
          jobStatus: response.status ?? "queued",
          platform,
        });
        if (jobId) {
          startPublishJobPoll(jobId, platform);
          setPublishMessage(`Publish job queued for ${platform}.`);
        } else {
          setPublishMessage(`Publish job queued for ${platform}. Status will update when complete.`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to queue publish job";
        setPublishMessage(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setPublishing(false);
      }
    },
    [pieceId, piece, startPublishJobPoll],
  );

  const loadCmsConnections = useCallback(async () => {
    if (!piece?.websiteProjectId) {
      throw new Error("Project not loaded");
    }
    return apiFetch<Record<string, unknown>>(
      `/api/website-projects/${piece.websiteProjectId}/cms-integrations`,
    );
  }, [piece?.websiteProjectId]);

  const renderPreview = useCallback(
    async (platform: PublishDestinationId) => {
      if (!pieceId || !piece) {
        throw new Error("Content piece not loaded");
      }
      const metadata = piece.pieceMetadata ?? {};
      const outputMode = metadata.intendedOutputMode ?? metadata.intendedEditorMode ?? undefined;
      return apiFetch<{
        payloadKind?: string;
        previewHtml?: string | null;
        previewJson?: unknown;
        warnings?: Array<{ code?: string; message: string }>;
      }>(`/api/content-pieces/${pieceId}/render-preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          platform,
          ...(outputMode ? { outputMode } : {}),
        }),
      });
    },
    [pieceId, piece],
  );

  const queryError =
    query.error instanceof Error
      ? query.error.message
      : query.error
        ? "Failed to load content piece"
        : null;

  return {
    loading,
    error: error ?? queryError,
    notFound,
    piece,
    generating,
    generatingState,
    generateMessage,
    generate,
    staleGenerating,
    resetToDraft,
    saving,
    saveMessage,
    save,
    humanizing,
    humanizeMessage,
    humanize,
    deleting,
    deletePiece,
    markingReady,
    markReady,
    regenerating,
    regenerateMessage,
    regenerate,
    enhancing,
    enhanceMessage,
    enhance,
    repurpose,
    regeneratingImages,
    regenerateImages,
    stockImagesConfigured: isStockImagesConfigured(stockQuery.data),
    publishing,
    publishingState,
    publishMessage,
    publishToDestination,
    loadCmsConnections,
    renderPreview,
    reload: load,
  };
}
