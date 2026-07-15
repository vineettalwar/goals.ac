import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  fetchAiProviderStatus,
  fetchProjectBrandProfile,
  fetchProjectContentPieces,
} from "@/lib/queries/fetchers";
import { queryKeys } from "@/lib/queries/keys";
import type { BrandProfileSummary, CreateContentDraftInput, StudioPiece } from "@workspace/app-shell";
import type { ContentPiece } from "@/types/api";

const STUDIO_POLL_MS = 3000;

function mapStudioPiece(piece: ContentPiece): StudioPiece {
  return {
    id: piece.id,
    title: piece.title,
    formatType: piece.formatType,
    targetKeyword: piece.targetKeyword ?? null,
    status: piece.status,
    wordCount: piece.wordCount,
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
    queryFn: () => fetchProjectContentPieces(projectId!),
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

      const piece = await apiFetch<ContentPiece>(
        `/api/website-projects/${projectId}/content-pieces`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
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
