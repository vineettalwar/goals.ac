"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { scoreArticleQuality } from "@workspace/content-engine/articles/article-quality-score";
import { isHumanizableFormat } from "@workspace/content-engine/content/humanize-eligibility";
import { isSeoLongformFormat } from "@workspace/content-engine/content/content-piece-seo";
import {
  contentPieceCanQueueSocial,
  contentPieceSupportsStockImages,
} from "@workspace/app-shell/content-piece";
import { FORMAT_OPTIONS } from "@/lib/content/content-format-options";
import {
  type ContentFormatType,
  type PublishDestinationId,
  getConnectedDestinationsForFormat,
  getDestinationsForFormat,
  type CmsConnectionSnapshot,
} from "@/lib/projects/publishing-destinations";
import type { ContentPieceRecord } from "@/lib/server/loaders";
import { ContentPieceLayout } from "@/components/content/content-piece-layout";
import { defaultPublishPlatform } from "@/components/content/content-piece-utils";
import { useContentPieceHandlers } from "@/components/content/use-content-piece-handlers";

interface ContentPieceClientProps {
  pieceId: string;
  initialPiece: ContentPieceRecord;
  initialCmsConnections: CmsConnectionSnapshot;
  stockImagesConfigured: boolean;
}

export function ContentPieceClient({
  pieceId,
  initialPiece,
  initialCmsConnections,
  stockImagesConfigured,
}: ContentPieceClientProps) {
  const router = useRouter();
  const [piece, setPiece] = useState(initialPiece);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingPreview, setEditingPreview] = useState(false);
  const [bodyDraft, setBodyDraft] = useState(initialPiece.bodyMarkdown ?? "");
  const [titleDraft, setTitleDraft] = useState(initialPiece.title ?? "");
  const [statusDraft, setStatusDraft] = useState(initialPiece.status);
  const [plannedDateDraft, setPlannedDateDraft] = useState(initialPiece.plannedDate ?? "");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState<PublishDestinationId>(() =>
    defaultPublishPlatform(initialPiece.formatType, initialCmsConnections, initialPiece.pieceMetadata),
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewJson, setPreviewJson] = useState<unknown>(null);
  const [previewWarnings, setPreviewWarnings] = useState<{ code: string; message: string }[]>([]);
  const [previewKind, setPreviewKind] = useState<string | null>(null);
  const [cmsConnections] = useState(initialCmsConnections);
  const [deleting, setDeleting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [regeneratingImages, setRegeneratingImages] = useState(false);
  const [queueingSocial, setQueueingSocial] = useState(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const featuredImage = piece.pieceMetadata?.images?.find((img) => img.role === "featured");
  const supportsStockImages = contentPieceSupportsStockImages(piece.formatType);

  const displayBody = editing ? bodyDraft : piece.bodyMarkdown;
  const displayTitle = editing ? titleDraft : piece.title;
  const seoTitle = piece.pieceMetadata?.seoTitle ?? displayTitle;
  const displayWordCount = useMemo(
    () => (editing ? bodyDraft.split(/\s+/).filter(Boolean).length : piece.wordCount),
    [editing, bodyDraft, piece.wordCount],
  );

  const visualSummaryMarkdown = useMemo(() => {
    const fromMeta = piece.pieceMetadata?.visualSummaryMarkdown;
    if (fromMeta) return fromMeta;
    const match = displayBody.match(/##\s*Visual Summary[\s\S]*?(?=\n##\s|$)/i);
    return match?.[0] ?? null;
  }, [piece.pieceMetadata?.visualSummaryMarkdown, displayBody]);

  const canEnhance = isSeoLongformFormat(piece.formatType as ContentFormatType);
  const canHumanize = isHumanizableFormat(piece.formatType);
  const humanizationAudit = piece.pieceMetadata?.humanizationAudit;
  // Toolbar Enhance emphasis only — ring score lives in ArticleQualityPanel (debounced).
  const qualityScore = useMemo(
    () =>
      scoreArticleQuality({
        bodyMarkdown: displayBody,
        metaTitle: seoTitle,
        metaDescription: piece.pieceMetadata?.metaDescription,
        citations: piece.pieceMetadata?.citations,
        faqSection: piece.pieceMetadata?.faqSection,
        jsonLdSchema: piece.pieceMetadata?.jsonLdSchema,
        internalLinkSuggestions: piece.pieceMetadata?.internalLinkSuggestions,
        wordCount: displayWordCount,
      }).total,
    [displayBody, seoTitle, displayWordCount, piece.pieceMetadata],
  );

  const {
    handleSave,
    cancelEdit,
    startEdit,
    handleRegenerate,
    handleEnhance,
    handleHumanize,
    regenerateImages,
    handlePublishPreview,
    handlePublish,
    handleDelete,
    handleMarkReady,
    handleCopy,
  } = useContentPieceHandlers({
    pieceId,
    piece,
    setPiece,
    titleDraft,
    bodyDraft,
    statusDraft,
    plannedDateDraft,
    publishPlatform,
    displayBody,
    setSaving,
    setEditing,
    setEditingPreview,
    setTitleDraft,
    setBodyDraft,
    setStatusDraft,
    setPlannedDateDraft,
    setRegenerating,
    setEnhancing,
    setHumanizing,
    setRegeneratingImages,
    setPreviewLoading,
    setPreviewHtml,
    setPreviewJson,
    setPreviewWarnings,
    setPreviewKind,
    setPublishing,
    setDeleting,
    setCopied,
    router,
  });

  const canQueueSocial = contentPieceCanQueueSocial(
    piece.formatType,
    piece.status,
    piece.bodyMarkdown,
  );

  const handleQueueSocial = useCallback(async () => {
    if (!piece.websiteProjectId || !canQueueSocial) return;
    setQueueingSocial(true);
    try {
      const res = await fetch(`/api/website-projects/${piece.websiteProjectId}/social/composer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPieceId: piece.id,
          platforms: ["linkedin", "twitter"],
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { pieces?: unknown[]; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not queue social posts");
      }
      const count = data?.pieces?.length ?? 0;
      toast.success(`Queued ${count} LinkedIn + X variants`);
      router.push(`/projects/${piece.websiteProjectId}/social?tab=queue`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not queue social posts");
    } finally {
      setQueueingSocial(false);
    }
  }, [piece.websiteProjectId, piece.id, canQueueSocial, router]);

  const formatLabel =
    FORMAT_OPTIONS.find((o) => o.value === piece.formatType)?.label ?? piece.formatType;

  const publishDestinations = getDestinationsForFormat(piece.formatType as ContentFormatType);
  const connectedDestinations = getConnectedDestinationsForFormat(
    piece.formatType as ContentFormatType,
    cmsConnections,
  );

  return <ContentPieceLayout
    piece={piece} pieceId={pieceId} editing={editing} editingPreview={editingPreview}
    displayBody={displayBody} displayTitle={displayTitle} displayWordCount={displayWordCount}
    titleDraft={titleDraft} bodyDraft={bodyDraft} statusDraft={statusDraft} plannedDateDraft={plannedDateDraft}
    formatLabel={formatLabel} qualityScore={qualityScore}
    publishDestinations={publishDestinations} connectedDestinations={connectedDestinations}
    publishPlatform={publishPlatform} setPublishPlatform={setPublishPlatform}
    publishing={publishing} saving={saving} regenerating={regenerating} enhancing={enhancing}
    humanizing={humanizing} regeneratingImages={regeneratingImages} deleting={deleting}
    copied={copied} previewLoading={previewLoading} previewHtml={previewHtml}
    previewJson={previewJson} previewWarnings={previewWarnings} previewKind={previewKind}
    repurposeOpen={repurposeOpen} setRepurposeOpen={setRepurposeOpen}
    featuredImage={featuredImage} supportsStockImages={supportsStockImages}
    stockImagesConfigured={stockImagesConfigured} canEnhance={canEnhance} canHumanize={canHumanize}
    humanizationAudit={humanizationAudit} visualSummaryMarkdown={visualSummaryMarkdown}
    seoTitle={seoTitle} bodyTextareaRef={bodyTextareaRef}
    handleSave={handleSave} cancelEdit={cancelEdit} startEdit={startEdit}
    handleRegenerate={handleRegenerate} handleEnhance={handleEnhance} handleHumanize={handleHumanize}
    regenerateImages={regenerateImages} handlePublishPreview={handlePublishPreview}
    handlePublish={handlePublish} handleDelete={handleDelete} handleMarkReady={handleMarkReady}
    handleCopy={handleCopy} setEditingPreview={setEditingPreview}
    setTitleDraft={setTitleDraft} setBodyDraft={setBodyDraft} setStatusDraft={setStatusDraft}
    setPlannedDateDraft={setPlannedDateDraft} router={router}
    canQueueSocial={canQueueSocial} queueingSocial={queueingSocial}
    handleQueueSocial={handleQueueSocial}
  />;
}