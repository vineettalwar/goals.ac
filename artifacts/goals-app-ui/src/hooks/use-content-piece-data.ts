import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  ContentPieceDetail,
  ContentPieceGeneratingState,
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
    updatedAt: piece.updatedAt,
    bodyMarkdown: piece.bodyMarkdown ?? null,
  };
}

function isTerminalJobStatus(status: string | undefined): boolean {
  return status != null && TERMINAL_JOB_STATUSES.has(status);
}

export function useContentPieceData(pieceId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [piece, setPiece] = useState<ContentPieceDetail | null>(null);
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

  const loadPiece = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!pieceId) return null;
      try {
        const row = await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}`);
        const mapped = mapPiece(row);
        setPiece(mapped);
        setNotFound(false);
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
          setNotFound(true);
          setPiece(null);
        } else if (!options?.silent) {
          setError(message);
        }
        return null;
      }
    },
    [pieceId, stopGenerateJobPoll, stopPublishJobPoll],
  );

  const load = useCallback(async () => {
    await loadPiece();
  }, [loadPiece]);

  useEffect(() => {
    if (!pieceId) return;
    setLoading(true);
    void loadPiece().finally(() => setLoading(false));
  }, [pieceId, loadPiece]);

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
      setPiece(mapPiece(updated));
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
      setPiece((prev) => (prev ? { ...prev, status: "generating" } : prev));
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
    async (payload: { title: string; bodyMarkdown: string }) => {
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
          }),
        });
        setPiece(mapPiece(updated));
        setSaveMessage("Saved.");
      } catch (err) {
        setSaveMessage(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [pieceId, piece],
  );

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
        },
      );
      setPiece(mapPiece(updated));
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

  return {
    loading,
    error,
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
    publishing,
    publishingState,
    publishMessage,
    publishToDestination,
    loadCmsConnections,
    reload: load,
  };
}
