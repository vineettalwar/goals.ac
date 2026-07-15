import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CreateContentDraftInput, StudioPiece } from "@workspace/app-shell";
import type { ContentPiece } from "@/types/api";

const STUDIO_POLL_MS = 3000;

type StudioLoadState = {
  loading: boolean;
  error: string | null;
  pieces: StudioPiece[];
  reload: () => Promise<void>;
  createPiece: (input: CreateContentDraftInput) => Promise<ContentPiece>;
};

function mapStudioPiece(piece: ContentPiece): StudioPiece {
  return {
    id: piece.id,
    title: piece.title,
    formatType: piece.formatType,
    targetKeyword: piece.targetKeyword ?? null,
    status: piece.status,
    wordCount: piece.wordCount,
    updatedAt: piece.updatedAt,
  };
}

export function useStudioData(projectId: string | null): StudioLoadState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pieces, setPieces] = useState<StudioPiece[]>([]);

  const reloadPieces = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!projectId) {
        setPieces([]);
        if (!options?.silent) {
          setLoading(false);
        }
        setError(null);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const rows = await apiFetch<ContentPiece[]>(
          `/api/website-projects/${projectId}/content-pieces`,
        );
        setPieces(rows.map(mapStudioPiece));
      } catch (err) {
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Failed to load content");
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [projectId],
  );

  const reload = useCallback(async () => {
    await reloadPieces();
  }, [reloadPieces]);

  useEffect(() => {
    void reloadPieces();
  }, [reloadPieces]);

  const hasGenerating = pieces.some((piece) => piece.status === "generating");

  useEffect(() => {
    if (!projectId || !hasGenerating) return;

    const interval = setInterval(() => {
      void reloadPieces({ silent: true });
    }, STUDIO_POLL_MS);

    return () => clearInterval(interval);
  }, [projectId, hasGenerating, reloadPieces]);

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

  return { loading, error, pieces, reload, createPiece };
}
