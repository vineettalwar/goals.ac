"use client";

/**
 * Thin Next host for shared `ContentPieceView` (parity with Vite ContentPiecePage).
 *
 * Shell owns layout + toolbar (including empty-draft Generate vs Regenerate,
 * and edit-time status draft/ready select).
 *
 * Kept Next-specific: cookie auth routes, SSR initialPiece/cmsConnections,
 * streaming ContentPieceRepurposeDialog, toast for hard failures.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import {
  ContentPiecePublishDialog,
  ContentPieceView,
  contentPieceCanDelete,
  contentPieceCanEnhance,
  contentPieceCanGenerate,
  contentPieceCanMarkReady,
  contentPieceCanPublish,
  contentPieceCanQueueSocial,
  formatEnhanceFailureMessage,
  formatEnhanceSuccessMessage,
  formatHumanizeResultMessage,
  formatQueueSocialSuccessMessage,
  humanizeAuditFromResponse,
  isMetaCmsConnected,
  QUEUE_SOCIAL_INSTAGRAM_SKIPPED_MESSAGE,
  queueSocialComposerPayload,
  queueSocialInstagramSkipped,
  socialComposerPath,
  socialHubQueuePath,
  type ContentPieceDetail,
  type ContentPieceMetadata,
  type PublishDestinationId,
  type RenderPreviewResult,
} from "@workspace/app-shell/content-piece";
import { resolveSocialPiecePublicImageUrl } from "@workspace/app-shell/social";
import type { CmsConnectionSnapshot } from "@/lib/projects/publishing-destinations";
import type { ContentPieceRecord } from "@/lib/server/loaders";
import { ArticlePerformanceBadge } from "@/components/content-studio/article-performance-badge";
import { BrandTailoringPanel } from "@/components/brand/brand-tailoring-panel";
import { ContentMarkdown } from "@/components/content/content-markdown";
import { ContentPieceRepurposeDialog } from "@/components/content/content-piece-repurpose-dialog";

export type BrandTailoringSummary = {
  voiceTone?: string;
  brandColors?: string[];
  productOfferings?: string[];
  doWords?: string[];
};

interface ContentPieceClientProps {
  pieceId: string;
  initialPiece: ContentPieceRecord;
  initialCmsConnections: CmsConnectionSnapshot;
  stockImagesConfigured: boolean;
  brandTailoring?: BrandTailoringSummary | null;
}

function toDetail(piece: ContentPieceRecord): ContentPieceDetail {
  return {
    id: piece.id,
    websiteProjectId: piece.websiteProjectId,
    title: piece.title,
    status: piece.status,
    formatType: piece.formatType,
    wordCount: piece.wordCount,
    targetKeyword: piece.targetKeyword ?? null,
    plannedDate: piece.plannedDate ?? null,
    updatedAt: piece.createdAt,
    bodyMarkdown: piece.bodyMarkdown ?? null,
    pieceMetadata: (piece.pieceMetadata as ContentPieceMetadata | null | undefined) ?? null,
    briefId: piece.briefId ?? null,
  };
}

function mergePieceJson(raw: unknown, prev: ContentPieceRecord): ContentPieceRecord {
  const data = (raw ?? {}) as Record<string, unknown>;
  const nested = data.piece;
  const next =
    nested && typeof nested === "object"
      ? { ...prev, ...(nested as ContentPieceRecord) }
      : { ...prev, ...(data as Partial<ContentPieceRecord>) };
  return next as ContentPieceRecord;
}

export function ContentPieceClient({
  pieceId,
  initialPiece,
  initialCmsConnections,
  stockImagesConfigured,
  brandTailoring = null,
}: ContentPieceClientProps) {
  const router = useRouter();
  const [pieceRecord, setPieceRecord] = useState(initialPiece);
  const piece = toDetail(pieceRecord);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [humanizing, setHumanizing] = useState(false);
  const [humanizeMessage, setHumanizeMessage] = useState<string | null>(null);
  const [revertingHumanize, setRevertingHumanize] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateMessage, setRegenerateMessage] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceMessage, setEnhanceMessage] = useState<string | null>(null);
  const [regeneratingImages, setRegeneratingImages] = useState(false);
  const [attachingFeaturedImageUrl, setAttachingFeaturedImageUrl] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [queueingSocial, setQueueingSocial] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [repurposeDialogOpen, setRepurposeDialogOpen] = useState(false);
  const pieceMeta = pieceRecord.pieceMetadata as ContentPieceMetadata | null | undefined;
  const visualSummaryMarkdown = pieceMeta?.visualSummaryMarkdown ?? null;
  const visualSummarySvgSrc =
    pieceMeta?.visualSummarySvgDataUri ??
    (pieceMeta?.visualSummarySvg
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pieceMeta.visualSummarySvg)}`
      : null);

  const fetchDualScore = useCallback(async (contentPieceId: number) => {
    try {
      const res = await fetch(`/api/content-pieces/${contentPieceId}/serp-score`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }, []);

  const fetchBrief = useCallback(async (briefId: number) => {
    try {
      const res = await fetch(`/api/briefs/${briefId}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }, []);

  const loadCmsConnections = useCallback(async () => {
    const res = await fetch(
      `/api/website-projects/${piece.websiteProjectId}/cms-integrations`,
    );
    if (!res.ok) {
      return initialCmsConnections as Record<string, unknown>;
    }
    return (await res.json()) as Record<string, unknown>;
  }, [piece.websiteProjectId, initialCmsConnections]);

  const renderPreview = useCallback(
    async (platform: PublishDestinationId): Promise<RenderPreviewResult> => {
      const meta = pieceRecord.pieceMetadata as ContentPieceMetadata | null | undefined;
      const res = await fetch(`/api/content-pieces/${pieceId}/render-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          outputMode: meta?.intendedOutputMode ?? meta?.intendedEditorMode,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to load publish preview");
      }
      return res.json() as Promise<RenderPreviewResult>;
    },
    [pieceId, pieceRecord.pieceMetadata],
  );

  async function queueSocial() {
    if (!piece.websiteProjectId) return;
    setQueueingSocial(true);
    try {
      let connections: Record<string, unknown> = initialCmsConnections as Record<
        string,
        unknown
      >;
      try {
        connections = (await loadCmsConnections()) as Record<string, unknown>;
      } catch {
        // Fall back to SSR snapshot when refresh fails.
      }
      const metaConnected = isMetaCmsConnected(connections);
      let bodyMarkdown = piece.bodyMarkdown;
      let pieceMetadata = piece.pieceMetadata;
      let hasImage = Boolean(
        resolveSocialPiecePublicImageUrl({ bodyMarkdown, pieceMetadata }),
      );
      // Generate already enriches before save. If Meta needs IG and we still lack a
      // public HTTPS image (enhance-only visual summary, CF sharp stub, stock miss),
      // try one stock enrich pass before omitting Instagram.
      if (metaConnected && !hasImage && stockImagesConfigured) {
        try {
          const enrichRes = await fetch(`/api/content-pieces/${pieceId}/images/regenerate`, {
            method: "POST",
          });
          if (enrichRes.ok) {
            const enrichData = (await enrichRes.json()) as { piece: ContentPieceRecord };
            setPieceRecord(enrichData.piece);
            bodyMarkdown = enrichData.piece.bodyMarkdown ?? bodyMarkdown;
            pieceMetadata =
              (enrichData.piece.pieceMetadata as ContentPieceMetadata | null | undefined) ??
              pieceMetadata;
            hasImage = Boolean(
              resolveSocialPiecePublicImageUrl({ bodyMarkdown, pieceMetadata }),
            );
          }
        } catch {
          // Keep current hasImage; Instagram will be skipped below if still missing.
        }
      }
      const queueOptions = { metaConnected, hasImage };
      const payload = queueSocialComposerPayload(piece.id, queueOptions);
      const res = await fetch(socialComposerPath(piece.websiteProjectId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as
        | { pieces?: unknown[]; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not queue social posts");
      }
      toast.success(
        formatQueueSocialSuccessMessage(data?.pieces?.length ?? 0, payload.platforms),
      );
      if (queueSocialInstagramSkipped(queueOptions)) {
        toast.message(QUEUE_SOCIAL_INSTAGRAM_SKIPPED_MESSAGE);
      }
      router.push(socialHubQueuePath(piece.websiteProjectId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not queue social posts");
    } finally {
      setQueueingSocial(false);
    }
  }

  return (
    <>
      <ContentPieceView
        piece={piece}
        headerExtra={
          <>
            <ArticlePerformanceBadge
              projectId={String(piece.websiteProjectId)}
              contentPieceId={piece.id}
              publishedUrl={pieceRecord.publishedUrl}
            />
            {pieceRecord.publishedUrl ? (
              <Link href="/search/performance" className="text-xs text-primary hover:underline">
                View performance
              </Link>
            ) : null}
          </>
        }
        asideExtra={
          <>
            {brandTailoring ? (
              <BrandTailoringPanel
                voiceTone={brandTailoring.voiceTone}
                brandColors={brandTailoring.brandColors}
                productOfferings={brandTailoring.productOfferings}
                doWords={brandTailoring.doWords}
              />
            ) : null}
            {(visualSummarySvgSrc || visualSummaryMarkdown) &&
            contentPieceCanEnhance(piece.formatType) ? (
              <div className="paper-card space-y-2 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <LayoutTemplate className="h-4 w-4 text-primary" aria-hidden />
                  Visual summary
                </div>
                {visualSummarySvgSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- SVG data URI from pieceMetadata
                  <img
                    src={visualSummarySvgSrc}
                    alt="At a glance"
                    className="w-full rounded-lg border border-border/60 bg-[#FAFAF8]"
                  />
                ) : null}
                {visualSummaryMarkdown ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <ContentMarkdown>{visualSummaryMarkdown}</ContentMarkdown>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        }
        saving={saving}
        saveMessage={saveMessage}
        onSave={async (payload) => {
          setSaving(true);
          setSaveMessage(null);
          try {
            const res = await fetch(`/api/content-pieces/${pieceId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: payload.title,
                bodyMarkdown: payload.bodyMarkdown,
                ...(payload.status ? { status: payload.status } : {}),
                plannedDate: payload.plannedDate ?? null,
              }),
            });
            if (!res.ok) {
              setSaveMessage("Save failed");
              toast.error("Save failed");
              return;
            }
            const updated = await res.json();
            setPieceRecord((prev) => mergePieceJson(updated, prev));
            setSaveMessage("Saved.");
          } finally {
            setSaving(false);
          }
        }}
        generating={generating}
        generateMessage={generateMessage}
        onGenerate={
          contentPieceCanGenerate(piece.status)
            ? async () => {
                setGenerating(true);
                setGenerateMessage(null);
                try {
                  // Next has no [id]/generate route; regenerate fills an empty draft.
                  const res = await fetch(`/api/content-pieces/${pieceId}/regenerate`, {
                    method: "POST",
                  });
                  if (!res.ok) {
                    setGenerateMessage("Generation failed");
                    toast.error("Generation failed");
                    return;
                  }
                  const updated = await res.json();
                  setPieceRecord((prev) => mergePieceJson(updated, prev));
                  setGenerateMessage("Content generated.");
                } finally {
                  setGenerating(false);
                }
              }
            : undefined
        }
        humanizing={humanizing}
        humanizeMessage={humanizeMessage}
        onHumanize={async () => {
          setHumanizing(true);
          setHumanizeMessage(null);
          try {
            const res = await fetch(`/api/content-pieces/${pieceId}/humanize`, {
              method: "POST",
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => null)) as { error?: string } | null;
              const msg = data?.error ?? "Humanization failed";
              setHumanizeMessage(msg);
              toast.error(msg);
              return;
            }
            const updated = await res.json();
            setPieceRecord((prev) => mergePieceJson(updated, prev));
            setHumanizeMessage(
              formatHumanizeResultMessage(humanizeAuditFromResponse(updated)),
            );
          } finally {
            setHumanizing(false);
          }
        }}
        onRevertHumanize={async () => {
          setRevertingHumanize(true);
          try {
            const res = await fetch(`/api/content-pieces/${pieceId}/humanize/revert`, {
              method: "POST",
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => null)) as { error?: string } | null;
              toast.error(data?.error ?? "Could not revert humanize");
              return;
            }
            const updated = await res.json();
            setPieceRecord((prev) => mergePieceJson(updated, prev));
            toast.success("Reverted to the version before humanize.");
          } finally {
            setRevertingHumanize(false);
          }
        }}
        revertingHumanize={revertingHumanize}
        regenerating={regenerating}
        regenerateMessage={regenerateMessage}
        onRegenerate={async () => {
          if (!confirm("Regenerate this content? The current draft will be replaced.")) {
            return;
          }
          setRegenerating(true);
          setRegenerateMessage(null);
          try {
            const res = await fetch(`/api/content-pieces/${pieceId}/regenerate`, {
              method: "POST",
            });
            if (!res.ok) {
              setRegenerateMessage("Regeneration failed");
              toast.error("Regeneration failed");
              return;
            }
            const updated = await res.json();
            setPieceRecord((prev) => mergePieceJson(updated, prev));
            setRegenerateMessage("Content regenerated.");
          } finally {
            setRegenerating(false);
          }
        }}
        enhancing={enhancing}
        enhanceMessage={enhanceMessage}
        onEnhance={async (missingTerms) => {
          setEnhancing(true);
          setEnhanceMessage(null);
          try {
            const res = await fetch(`/api/content-pieces/${pieceId}/enhance`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ missingTerms }),
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => null)) as { error?: string } | null;
              const msg = formatEnhanceFailureMessage(data?.error);
              setEnhanceMessage(msg);
              toast.error(msg);
              return;
            }
            const updated = await res.json();
            setPieceRecord((prev) => mergePieceJson(updated, prev));
            setEnhanceMessage(formatEnhanceSuccessMessage());
          } finally {
            setEnhancing(false);
          }
        }}
        regeneratingImages={regeneratingImages}
        onRegenerateImages={
          stockImagesConfigured
            ? async () => {
                setRegeneratingImages(true);
                try {
                  const res = await fetch(
                    `/api/content-pieces/${pieceId}/images/regenerate`,
                    { method: "POST" },
                  );
                  if (!res.ok) {
                    const data = (await res.json().catch(() => null)) as {
                      error?: string;
                    } | null;
                    toast.error(data?.error ?? "Failed to regenerate images");
                    return;
                  }
                  const data = (await res.json()) as { piece: ContentPieceRecord };
                  setPieceRecord(data.piece);
                } finally {
                  setRegeneratingImages(false);
                }
              }
            : undefined
        }
        attachingFeaturedImageUrl={attachingFeaturedImageUrl}
        onAttachFeaturedImageUrl={async (url) => {
          setAttachingFeaturedImageUrl(true);
          try {
            const res = await fetch(`/api/content-pieces/${pieceId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ featuredImageUrl: url }),
            });
            if (!res.ok) {
              const data = (await res.json().catch(() => null)) as { error?: string } | null;
              toast.error(data?.error ?? "Could not attach image URL");
              return;
            }
            const updated = await res.json();
            setPieceRecord((prev) => mergePieceJson(updated, prev));
            toast.success("Featured image URL attached");
          } finally {
            setAttachingFeaturedImageUrl(false);
          }
        }}
        publishing={publishing}
        publishMessage={publishMessage}
        onPublish={
          contentPieceCanPublish(piece.status)
            ? () => setPublishDialogOpen(true)
            : undefined
        }
        deleting={deleting}
        onDelete={
          contentPieceCanDelete(piece.status)
            ? async () => {
                if (!confirm("Delete this content piece?")) return;
                setDeleting(true);
                try {
                  const res = await fetch(`/api/content-pieces/${pieceId}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) {
                    toast.error("Delete failed");
                    return;
                  }
                  toast.success("Deleted");
                  router.push(`/projects/${piece.websiteProjectId}/content-studio`);
                } finally {
                  setDeleting(false);
                }
              }
            : undefined
        }
        markingReady={markingReady}
        onMarkReady={
          contentPieceCanMarkReady(piece.status, piece.bodyMarkdown)
            ? async () => {
                setMarkingReady(true);
                try {
                  const res = await fetch(`/api/content-pieces/${pieceId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "ready" }),
                  });
                  if (!res.ok) {
                    toast.error("Failed to update status");
                    return;
                  }
                  const updated = await res.json();
                  setPieceRecord((prev) => mergePieceJson(updated, prev));
                } finally {
                  setMarkingReady(false);
                }
              }
            : undefined
        }
        onRepurpose={() => setRepurposeDialogOpen(true)}
        onQueueSocial={
          contentPieceCanQueueSocial(piece.formatType, piece.status, piece.bodyMarkdown)
            ? () => void queueSocial()
            : undefined
        }
        queueingSocial={queueingSocial}
        stockImagesConfigured={stockImagesConfigured}
        fetchDualScore={fetchDualScore}
        fetchBrief={fetchBrief}
        renderLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />

      <ContentPiecePublishDialog
        open={publishDialogOpen}
        onClose={() => !publishing && setPublishDialogOpen(false)}
        formatType={piece.formatType}
        loadConnections={loadCmsConnections}
        publishing={publishing}
        integrationsHref={`/projects/${piece.websiteProjectId}/integrations`}
        pieceTitle={piece.title}
        pieceBodyMarkdown={piece.bodyMarkdown}
        pieceFeaturedImageUrl={pieceMeta?.featuredImageUrl ?? null}
        onRenderPreview={renderPreview}
        plannedDate={piece.plannedDate}
        onPublish={async (platform) => {
          setPublishing(true);
          setPublishMessage(null);
          try {
            const res = await fetch(`/api/content-pieces/${pieceId}/publish`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ platform, async: true }),
            });
            if (!res.ok) {
              setPublishMessage("Failed to publish");
              toast.error("Failed to publish");
              return;
            }
            const updated = await res.json();
            if (updated.queued) {
              setPublishMessage(`Publishing to ${platform} — running in the background`);
            } else {
              setPieceRecord((prev) => mergePieceJson(updated, prev));
              setPublishMessage(`Published to ${platform}.`);
            }
            setPublishDialogOpen(false);
          } finally {
            setPublishing(false);
          }
        }}
      />

      <ContentPieceRepurposeDialog
        open={repurposeDialogOpen}
        onClose={() => setRepurposeDialogOpen(false)}
        pieceId={piece.id}
        projectId={piece.websiteProjectId}
        currentFormat={piece.formatType}
      />
    </>
  );
}
