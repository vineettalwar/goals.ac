"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  formatHumanizeResultMessage,
  humanizeAuditFromResponse,
} from "@workspace/app-shell/content-piece-actions";
import {
  SOCIAL_FORMAT_TYPES,
  resolveSocialPiecePublicImageUrl,
  type SocialComposedPiece,
  type SocialComposerParent,
  type SocialHubTab,
  type SocialPlatformId,
} from "@workspace/app-shell/social";

export function useSocialHubComposer(
  projectId: string,
  tab: SocialHubTab,
  loadQueue: () => Promise<void>,
) {
  const [composerParents, setComposerParents] = useState<SocialComposerParent[]>([]);
  const [composerParentsLoading, setComposerParentsLoading] = useState(false);
  const [composerConnected, setComposerConnected] = useState<Record<string, boolean>>({});
  const [composing, setComposing] = useState(false);
  const [composed, setComposed] = useState<SocialComposedPiece[] | null>(null);
  const [attachingImage, setAttachingImage] = useState(false);
  const [humanizingPieceId, setHumanizingPieceId] = useState<number | null>(null);

  const loadComposerParents = useCallback(async () => {
    setComposerParentsLoading(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/content-pieces`);
      if (!res.ok) throw new Error("Failed to load content");
      const data = (await res.json()) as
        | SocialComposerParent[]
        | { pieces?: SocialComposerParent[] };
      const list = Array.isArray(data) ? data : (data.pieces ?? []);
      setComposerParents(
        list.filter(
          (piece) =>
            !SOCIAL_FORMAT_TYPES.has(piece.formatType) &&
            (piece.bodyMarkdown?.trim().length ?? 0) > 50,
        ),
      );
    } catch {
      toast.error("Could not load source content");
    } finally {
      setComposerParentsLoading(false);
    }
  }, [projectId]);

  const loadComposerConnections = useCallback(async () => {
    try {
      const res = await fetch(`/api/website-projects/${projectId}/cms-integrations`);
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, unknown>;
      setComposerConnected({
        linkedin: Boolean(data.linkedin),
        twitter: Boolean(data.twitter),
        instagram: Boolean(data.meta),
        facebook: Boolean(data.meta),
        bluesky: Boolean(data.bluesky),
        mastodon: Boolean(data.mastodon),
      });
    } catch {
      /* optional */
    }
  }, [projectId]);

  useEffect(() => {
    if (tab === "compose") {
      void loadComposerParents();
      void loadComposerConnections();
    }
  }, [tab, loadComposerParents, loadComposerConnections]);

  function patchComposerParentImage(
    parentPieceId: number,
    pieceMetadata: SocialComposerParent["pieceMetadata"],
  ) {
    setComposerParents((prev) =>
      prev.map((parent) =>
        parent.id === parentPieceId ? { ...parent, pieceMetadata } : parent,
      ),
    );
  }

  async function attachFeaturedImageUrl(parentPieceId: number, url: string) {
    const trimmed = url.trim();
    if (!/^https:\/\//i.test(trimmed)) {
      toast.error("Use a public HTTPS image URL");
      return;
    }
    setAttachingImage(true);
    try {
      const res = await fetch(`/api/content-pieces/${parentPieceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredImageUrl: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as
        | SocialComposerParent
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          data && "error" in data && data.error ? data.error : "Could not attach image URL",
        );
      }
      const meta =
        data && "pieceMetadata" in data
          ? (data.pieceMetadata as SocialComposerParent["pieceMetadata"])
          : { featuredImageUrl: trimmed };
      patchComposerParentImage(parentPieceId, meta);
      toast.success("Featured image URL attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not attach image URL");
    } finally {
      setAttachingImage(false);
    }
  }

  async function useStockImage(parentPieceId: number) {
    setAttachingImage(true);
    try {
      const res = await fetch(`/api/content-pieces/${parentPieceId}/images/regenerate`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { piece?: SocialComposerParent; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Stock image search failed");
      }
      const piece = data?.piece;
      if (!piece) throw new Error("Stock image search failed");
      patchComposerParentImage(parentPieceId, piece.pieceMetadata ?? null);
      if (!resolveSocialPiecePublicImageUrl(piece)) {
        toast.message("No public HTTPS image found — paste a URL or try again");
        return;
      }
      toast.success("Stock image attached for Instagram");
      void loadQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stock image search failed");
    } finally {
      setAttachingImage(false);
    }
  }

  async function compose(parentPieceId: number, platforms: SocialPlatformId[]) {
    if (platforms.length === 0) {
      toast.error("Select a source article and at least one platform");
      return;
    }
    setComposing(true);
    setComposed(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/composer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPieceId, platforms }),
      });
      const data = (await res.json()) as { pieces?: SocialComposedPiece[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Composer failed");
      setComposed(data.pieces ?? []);
      toast.success(`Created ${data.pieces?.length ?? 0} platform variants`);
      void loadQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Composer failed");
    } finally {
      setComposing(false);
    }
  }

  async function humanizeComposedPiece(pieceId: number) {
    setHumanizingPieceId(pieceId);
    try {
      const res = await fetch(`/api/content-pieces/${pieceId}/humanize`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | (Partial<SocialComposedPiece> & { error?: string })
        | null;
      if (!res.ok) throw new Error(data?.error ?? "Humanization failed");
      setComposed((prev) =>
        prev
          ? prev.map((piece) =>
              piece.id === pieceId
                ? {
                    ...piece,
                    bodyMarkdown: data?.bodyMarkdown ?? piece.bodyMarkdown,
                    pieceMetadata: data?.pieceMetadata ?? piece.pieceMetadata,
                  }
                : piece,
            )
          : prev,
      );
      toast.success(formatHumanizeResultMessage(humanizeAuditFromResponse(data ?? {})));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Humanization failed");
    } finally {
      setHumanizingPieceId(null);
    }
  }

  return {
    composerParents,
    composerParentsLoading,
    composerConnected,
    composing,
    composed,
    compose,
    attachingImage,
    attachFeaturedImageUrl,
    useStockImage,
    humanizingPieceId,
    humanizeComposedPiece,
  };
}
