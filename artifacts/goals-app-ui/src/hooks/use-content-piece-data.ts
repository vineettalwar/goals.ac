import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ContentPieceDetail, ContentPieceGeneratingState } from "@workspace/app-shell";
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

type JobStatusResponse = {
  jobId: string;
  status: string;
  queue?: string;
  error?: string;
  message?: string;
  updatedAt?: string;
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
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [generatingState, setGeneratingState] = useState<ContentPieceGeneratingState | null>(
    null,
  );
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopJobPoll = useCallback(() => {
    if (jobPollRef.current) {
      clearInterval(jobPollRef.current);
      jobPollRef.current = null;
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
          stopJobPoll();
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
    [pieceId, stopJobPoll],
  );

  const load = useCallback(async () => {
    await loadPiece();
  }, [loadPiece]);

  useEffect(() => {
    if (!pieceId) return;
    setLoading(true);
    void loadPiece().finally(() => setLoading(false));
  }, [pieceId, loadPiece]);

  const pollJobOnce = useCallback(
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
          stopJobPoll();
          const refreshed = await loadPiece({ silent: true });
          if (jobStatus === "completed") {
            setGenerateMessage("Content generation complete.");
          } else {
            setGenerateMessage(
              status.error ?? status.message ?? "Content generation failed.",
            );
          }
          if (refreshed?.status === "generating") {
            setGeneratingState({
              message: "Generating content…",
              jobId,
              jobStatus,
            });
          }
        }
      } catch {
        // Ignore transient poll errors; piece polling covers completion.
      }
    },
    [loadPiece, stopJobPoll],
  );

  const startJobPoll = useCallback(
    (jobId: string) => {
      stopJobPoll();
      void pollJobOnce(jobId);
      jobPollRef.current = setInterval(() => {
        void pollJobOnce(jobId);
      }, JOB_POLL_MS);
    },
    [pollJobOnce, stopJobPoll],
  );

  useEffect(() => () => stopJobPoll(), [stopJobPoll]);

  useEffect(() => {
    if (!pieceId || piece?.status !== "generating") return;

    setGeneratingState((prev) => prev ?? { message: "Generating content…" });

    const interval = setInterval(() => {
      void loadPiece({ silent: true });
    }, PIECE_POLL_MS);

    return () => clearInterval(interval);
  }, [pieceId, piece?.status, loadPiece]);

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
        startJobPoll(jobId);
      } else {
        setGenerateMessage("Generate job queued. Content will update when complete.");
      }
    } catch (err) {
      setGenerateMessage(
        err instanceof Error ? err.message : "Failed to queue generate job",
      );
    } finally {
      setGenerating(false);
    }
  }, [pieceId, piece, startJobPoll]);

  const publish = useCallback(async () => {
    if (!pieceId || !piece) return;
    setPublishing(true);
    setPublishMessage(null);
    try {
      await apiFetch<{ id?: string }>(`/api/content-pieces/${pieceId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentPieceId: piece.id }),
      });
      setPublishMessage("Publish job queued. Status will update when complete.");
      await load();
    } catch (err) {
      setPublishMessage(
        err instanceof Error ? err.message : "Failed to queue publish job",
      );
    } finally {
      setPublishing(false);
    }
  }, [pieceId, piece, load]);

  return {
    loading,
    error,
    notFound,
    piece,
    generating,
    generatingState,
    generateMessage,
    generate,
    publishing,
    publishMessage,
    publish,
    reload: load,
  };
}
