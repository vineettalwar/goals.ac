import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, API_FETCH_AI_TIMEOUT_MS, getApiBase } from "@/lib/api";
import {
  fetchAiProviderStatus,
  fetchProjectBrandProfile,
  fetchProjectContentPieces,
} from "@/lib/queries/fetchers";
import { queryKeys } from "@/lib/queries/keys";
import type { BrandProfileSummary, CreateContentDraftInput, StudioPiece } from "@workspace/app-shell";
import type { ContentPiece } from "@/types/api";

const STUDIO_POLL_MS = 3000;

type CreateGeneratePayload = {
  formatType: string;
  targetKeyword: string;
  angleHint?: string;
  plannedDate?: string;
  intendedPublishPlatform?: string;
  competitorFocusUrl?: string;
  competitorUrls?: string[];
};

function buildCreateGeneratePayload(input: CreateContentDraftInput): CreateGeneratePayload {
  const payload: CreateGeneratePayload = {
    formatType: input.formatType,
    targetKeyword: input.targetKeyword.trim(),
  };
  const angle = input.angleHint?.trim();
  if (angle) payload.angleHint = angle;
  const planned = input.plannedDate?.trim();
  if (planned) payload.plannedDate = planned;
  const platform = input.intendedPublishPlatform?.trim();
  if (platform) payload.intendedPublishPlatform = platform;
  const competitor = input.competitorFocusUrl?.trim();
  if (competitor) payload.competitorFocusUrl = competitor;
  const competitorUrls = input.competitorUrls?.map((u) => u.trim()).filter(Boolean);
  if (competitorUrls && competitorUrls.length > 0) {
    payload.competitorUrls = competitorUrls.slice(0, 5);
    if (!payload.competitorFocusUrl) payload.competitorFocusUrl = competitorUrls[0];
  }
  return payload;
}

/** Mirror Next CreateContentModal: stream create+generate, then sync POST fallback. */
async function createPieceViaStream(
  projectId: string,
  payload: CreateGeneratePayload,
): Promise<ContentPiece | null> {
  const path = `/api/website-projects/${projectId}/content-pieces/generate/stream`;
  const base = getApiBase();
  const url = base ? `${base}${path}` : path;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return null;
  }

  if (!response.ok || !response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let pendingEvent: string | null = null;
  let finalPiece: ContentPiece | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        pendingEvent = line.slice(7).trim();
        continue;
      }
      if (!line.startsWith("data: ")) continue;
      const eventPayload = line.slice(6);
      if (pendingEvent === "error") {
        let message = "Generation failed";
        try {
          const errData = JSON.parse(eventPayload) as { error?: string };
          if (errData.error) message = errData.error;
        } catch {
          // keep default
        }
        throw new Error(message);
      }
      if (pendingEvent === "done" || pendingEvent === "cached") {
        try {
          const parsed = JSON.parse(eventPayload) as ContentPiece;
          if (parsed && typeof parsed === "object" && "id" in parsed) {
            finalPiece = parsed;
          }
        } catch {
          // ignore malformed payload
        }
      }
      pendingEvent = null;
    }
  }

  return finalPiece;
}

function asContentPieceRows(payload: unknown): ContentPiece[] {
  if (Array.isArray(payload)) return payload as ContentPiece[];
  if (
    payload &&
    typeof payload === "object" &&
    "pieces" in payload &&
    Array.isArray((payload as { pieces: unknown }).pieces)
  ) {
    return (payload as { pieces: ContentPiece[] }).pieces;
  }
  return [];
}

function mapStudioPiece(piece: ContentPiece): StudioPiece {
  return {
    id: piece.id,
    title: piece.title ?? "",
    formatType: piece.formatType ?? "blog_post",
    targetKeyword: piece.targetKeyword ?? null,
    status: piece.status ?? "draft",
    wordCount: typeof piece.wordCount === "number" && Number.isFinite(piece.wordCount) ? piece.wordCount : 0,
    plannedDate: piece.plannedDate ?? null,
    updatedAt: piece.updatedAt,
  };
}

export function useStudioData(projectId: string | null) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [markingReadyId, setMarkingReadyId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const piecesQuery = useQuery({
    queryKey: queryKeys.contentPieces(projectId),
    queryFn: async () => {
      const payload = await fetchProjectContentPieces(projectId!);
      return asContentPieceRows(payload);
    },
    enabled: Boolean(projectId),
    staleTime: 10_000,
    placeholderData: (previousData) => previousData,
    select: (rows) => rows.map(mapStudioPiece),
    refetchInterval: (currentQuery) => {
      const pieces = currentQuery.state.data ?? [];
      return pieces.some((piece) => piece.status === "generating") ? STUDIO_POLL_MS : false;
    },
  });

  const brandQuery = useQuery({
    queryKey: queryKeys.projectBrandProfile(projectId),
    queryFn: () => fetchProjectBrandProfile(projectId!),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  const aiStatusQuery = useQuery({
    queryKey: queryKeys.aiProviderStatus,
    queryFn: fetchAiProviderStatus,
    staleTime: 60_000,
  });

  const reload = useCallback(async () => {
    if (!projectId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.contentPieces(projectId) });
  }, [projectId, queryClient]);

  const createPiece = useCallback(
    async (input: CreateContentDraftInput) => {
      if (!projectId) {
        throw new Error("No project selected");
      }

      const payload = buildCreateGeneratePayload(input);
      if (!payload.targetKeyword) {
        throw new Error("Target keyword is required");
      }

      let piece = await createPieceViaStream(projectId, payload);
      if (!piece) {
        piece = await apiFetch<ContentPiece>(
          `/api/website-projects/${projectId}/content-pieces`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
            timeoutMs: API_FETCH_AI_TIMEOUT_MS,
          },
        );
      }

      const preferredTitle = input.title?.trim();
      if (preferredTitle && preferredTitle !== piece.title) {
        try {
          piece = await apiFetch<ContentPiece>(`/api/content-pieces/${piece.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: preferredTitle }),
          });
        } catch {
          // Generated body is still usable; keep AI title if rename fails
        }
      }

      await reload();
      return piece;
    },
    [projectId, reload],
  );

  const deletePiece = useCallback(
    async (pieceId: number) => {
      setDeletingId(pieceId);
      setActionError(null);
      try {
        await apiFetch(`/api/content-pieces/${pieceId}`, { method: "DELETE" });
        await reload();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete content piece");
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    [reload],
  );

  const markReady = useCallback(
    async (pieceId: number) => {
      setMarkingReadyId(pieceId);
      setActionError(null);
      try {
        await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "ready" }),
        });
        await reload();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to mark content ready");
        throw err;
      } finally {
        setMarkingReadyId(null);
      }
    },
    [reload],
  );

  const reschedulePiece = useCallback(
    async (pieceId: number, plannedDate: string | null) => {
      setReschedulingId(pieceId);
      setActionError(null);
      try {
        await apiFetch<ContentPiece>(`/api/content-pieces/${pieceId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plannedDate }),
        });
        await reload();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to reschedule content");
        throw err;
      } finally {
        setReschedulingId(null);
      }
    },
    [reload],
  );

  const loading = piecesQuery.isPending && !piecesQuery.data;

  return {
    loading,
    error:
      actionError ??
      (piecesQuery.error instanceof Error
        ? piecesQuery.error.message
        : piecesQuery.error
          ? "Failed to load content"
          : null),
    pieces: piecesQuery.data ?? [],
    brandProfile: (brandQuery.data ?? null) as BrandProfileSummary | null,
    brandProfileLoading: brandQuery.isPending && !brandQuery.data,
    aiReady: aiStatusQuery.data?.ready ?? null,
    activeProvider: aiStatusQuery.data?.activeProvider ?? "gemini",
    reload,
    createPiece,
    deletePiece,
    markReady,
    reschedulePiece,
    deletingId,
    markingReadyId,
    reschedulingId,
  };
}
