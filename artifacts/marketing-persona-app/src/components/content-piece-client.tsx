"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Copy,
  Check,
  RefreshCw,
  Save,
  Pencil,
  Trash2,
  CheckCircle2,
  FileCode2,
  TrendingUp,
  Eye,
  Shuffle,
  ImageIcon,
  AlertTriangle,
  LayoutTemplate,
} from "lucide-react";
import { scoreArticleQuality } from "@workspace/content-engine/article-quality-score";
import { isSeoLongformFormat } from "@workspace/content-engine/content-piece-seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentMarkdown } from "@/components/content-markdown";
import { MarkdownToolbar } from "@/components/markdown-toolbar";
import { ArticleQualityPanel } from "@/components/article-quality-panel";
import { FORMAT_OPTIONS } from "@/lib/content/content-format-options";
import {
  type ContentFormatType,
  type PublishDestinationId,
  getConnectedDestinationsForFormat,
  getDestination,
  getDestinationsForFormat,
  type CmsConnectionSnapshot,
} from "@/lib/projects/publishing-destinations";
import type { ContentPieceRecord } from "@/lib/server/loaders";
import { ArticlePerformanceBadge } from "@/components/content-studio/article-performance-badge";
import { ContentPieceRepurposeDialog } from "@/components/content-piece-repurpose-dialog";
import { cn } from "@/lib/utils";

interface ContentPieceClientProps {
  pieceId: string;
  initialPiece: ContentPieceRecord;
  initialCmsConnections: CmsConnectionSnapshot;
  stockImagesConfigured: boolean;
}

function defaultPublishPlatform(
  formatType: string,
  connections: CmsConnectionSnapshot,
  pieceMetadata?: { intendedPublishPlatform?: string } | null,
): PublishDestinationId {
  const intended = pieceMetadata?.intendedPublishPlatform as PublishDestinationId | undefined;
  if (intended) {
    const def = getDestination(intended);
    if (def && !def.exportOnly && def.isConnected(connections)) return intended;
  }
  const connected = getConnectedDestinationsForFormat(formatType as ContentFormatType, connections);
  if (connected[0]) return connected[0].id;
  const fallback = getDestinationsForFormat(formatType as ContentFormatType).find(
    (d) => !d.exportOnly,
  );
  return fallback?.id ?? "wordpress";
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
  const [regeneratingImages, setRegeneratingImages] = useState(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const featuredImage = piece.pieceMetadata?.images?.find((img) => img.role === "featured");
  const supportsStockImages =
    isSeoLongformFormat(piece.formatType as ContentFormatType) || piece.formatType === "linkedin_post";

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
    [displayBody, seoTitle, displayTitle, displayWordCount, piece.pieceMetadata],
  );

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: titleDraft,
      bodyMarkdown: bodyDraft,
      plannedDate: plannedDateDraft || null,
    };
    if (piece.status !== "published") {
      payload.status = statusDraft;
    }
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setStatusDraft(updated.status);
    setPlannedDateDraft(updated.plannedDate ?? "");
    setEditing(false);
    setEditingPreview(false);
    toast.success("Saved");
  }

  function cancelEdit() {
    setTitleDraft(piece.title);
    setBodyDraft(piece.bodyMarkdown);
    setStatusDraft(piece.status);
    setPlannedDateDraft(piece.plannedDate ?? "");
    setEditing(false);
    setEditingPreview(false);
  }

  function startEdit() {
    setTitleDraft(piece.title);
    setBodyDraft(piece.bodyMarkdown);
    setStatusDraft(piece.status);
    setPlannedDateDraft(piece.plannedDate ?? "");
    setEditingPreview(false);
    setEditing(true);
  }

  async function handleRegenerate() {
    if (!confirm("Regenerate this content? The current draft will be replaced.")) return;
    setRegenerating(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/regenerate`, { method: "POST" });
    setRegenerating(false);
    if (!res.ok) {
      toast.error("Regeneration failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setBodyDraft(updated.bodyMarkdown);
    setTitleDraft(updated.title);
    setStatusDraft(updated.status);
    setPlannedDateDraft(updated.plannedDate ?? "");
    setEditing(false);
    setEditingPreview(false);
    toast.success("Regenerated");
  }

  async function handleEnhance() {
    setEnhancing(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/enhance`, { method: "POST" });
    setEnhancing(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "Enhancement failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setBodyDraft(updated.bodyMarkdown);
    setTitleDraft(updated.title);
    setEditing(false);
    setEditingPreview(false);
    toast.success("Quality enhanced — FAQ, citations, and links added");
  }

  async function regenerateImages() {
    setRegeneratingImages(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/images/regenerate`, { method: "POST" });
    setRegeneratingImages(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "Failed to regenerate images");
      return;
    }
    const data = (await res.json()) as { piece: ContentPieceRecord };
    setPiece(data.piece);
    toast.success("Images updated from keyword search");
  }

  async function handlePublishPreview() {
    setPreviewLoading(true);
    setPreviewHtml(null);
    setPreviewJson(null);
    setPreviewWarnings([]);
    setPreviewKind(null);
    const res = await fetch(`/api/content-pieces/${pieceId}/render-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: publishPlatform,
        outputMode: piece.pieceMetadata?.intendedOutputMode ?? piece.pieceMetadata?.intendedEditorMode,
      }),
    });
    setPreviewLoading(false);
    if (!res.ok) {
      toast.error("Failed to load publish preview");
      return;
    }
    const data = (await res.json()) as {
      payloadKind?: string;
      previewHtml?: string;
      previewJson?: unknown;
      warnings?: { code: string; message: string }[];
    };
    setPreviewKind(data.payloadKind ?? null);
    setPreviewHtml(data.previewHtml ?? null);
    setPreviewJson(data.previewJson ?? null);
    setPreviewWarnings(data.warnings ?? []);
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: publishPlatform, async: true }),
    });
    setPublishing(false);
    if (!res.ok) {
      toast.error("Failed to publish");
      return;
    }
    const updated = await res.json();
    if (updated.queued) {
      toast.success(`Publishing to ${publishPlatform} — running in the background`);
      return;
    }
    setPiece((prev) => (prev ? { ...prev, status: "published", ...(updated.piece ?? updated) } : prev));
    toast.success(`Published to ${publishPlatform}`);
  }

  async function handleDelete() {
    if (!confirm("Delete this content piece?")) return;
    setDeleting(true);
    const res = await fetch(`/api/content-pieces/${pieceId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    router.push(`/projects/${piece.websiteProjectId}/content-studio`);
  }

  async function handleMarkReady() {
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
    setPiece(updated.piece ?? updated);
    toast.success("Marked as ready");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(displayBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const formatLabel =
    FORMAT_OPTIONS.find((o) => o.value === piece.formatType)?.label ?? piece.formatType;

  const publishDestinations = getDestinationsForFormat(piece.formatType as ContentFormatType);
  const connectedDestinations = getConnectedDestinationsForFormat(
    piece.formatType as ContentFormatType,
    cmsConnections,
  );

  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start gap-3">
        <Link href={`/projects/${piece.websiteProjectId}/content-studio`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              className="text-2xl font-bold w-full bg-transparent border-b border-border pb-2 focus:outline-hidden"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
          ) : (
            <h1 className="text-2xl lg:text-3xl font-bold leading-tight">{piece.title}</h1>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="muted">{formatLabel}</Badge>
            {piece.targetKeyword && <Badge variant="muted">{piece.targetKeyword}</Badge>}
            <span className="text-xs text-muted-foreground">{displayWordCount.toLocaleString()} words</span>
            <Badge variant={piece.status === "published" ? "success" : "muted"}>{piece.status}</Badge>
            {piece.plannedDate && !editing && (
              <span className="text-xs text-muted-foreground">Planned {piece.plannedDate}</span>
            )}
            <ArticlePerformanceBadge
              projectId={String(piece.websiteProjectId)}
              contentPieceId={piece.id}
              publishedUrl={piece.publishedUrl}
            />
            {piece.publishedUrl ? (
              <Link
                href="/search/performance"
                className="text-xs text-primary hover:underline"
              >
                View performance
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          {featuredImage ? (
            <div className="paper-card rounded-xl p-4 flex flex-col sm:flex-row gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredImage.publishedUrl ?? featuredImage.remoteUrl}
                alt={featuredImage.alt}
                title={featuredImage.title}
                className="w-full sm:w-48 h-32 object-cover rounded-lg shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-medium">Featured image</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{featuredImage.alt}</p>
                <p className="text-xs text-muted-foreground">
                  {featuredImage.provider} · score {featuredImage.rankScore.toFixed(2)}
                  {featuredImage.publishedUrl
                    ? " · hosted on your site"
                    : " · uploaded as compressed WebP to your site on publish"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={regeneratingImages}
                  onClick={regenerateImages}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", regeneratingImages && "animate-spin")} />
                  {regeneratingImages ? "Finding image…" : "Pick another image"}
                </Button>
              </div>
            </div>
          ) : supportsStockImages ? (
            <div className="paper-card rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">Featured image</p>
                  <p className="text-xs text-muted-foreground">
                    {stockImagesConfigured
                      ? "Search Unsplash or Pexels for a copyright-free photo. On publish, we download, compress to WebP, and upload it to your site."
                      : "Stock photo search is unavailable until platform API keys are configured."}
                  </p>
                </div>
              </div>
              {stockImagesConfigured ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={regeneratingImages}
                  onClick={regenerateImages}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", regeneratingImages && "animate-spin")} />
                  {regeneratingImages ? "Finding image…" : "Add featured image"}
                </Button>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/40 px-3 py-2.5 text-xs text-muted-foreground dark:border-amber-500/30 dark:bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p>
                    Ask your admin to set UNSPLASH_ACCESS_KEY and/or PEXELS_API_KEY in the server
                    environment, then return here to add images.
                  </p>
                </div>
              )}
            </div>
          ) : null}
          <div className="paper-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 bg-muted/30">
              <div className="flex flex-wrap items-center gap-1.5">
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPreview((v) => !v)}
                    >
                      <Eye className="h-3.5 w-3.5" /> {editingPreview ? "Edit" : "Preview"}
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setRepurposeOpen(true)}>
                  <Shuffle className="h-3.5 w-3.5" /> Repurpose
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating || enhancing}>
                  <RefreshCw className={cn("h-3.5 w-3.5", regenerating && "animate-spin")} /> Regenerate
                </Button>
                {canEnhance && (
                  <Button
                    variant={qualityScore < 75 ? "default" : "outline"}
                    size="sm"
                    onClick={handleEnhance}
                    disabled={enhancing || regenerating}
                    title="Add FAQ, citations, and internal links without rewriting from scratch"
                  >
                    <TrendingUp className={cn("h-3.5 w-3.5", enhancing && "animate-pulse")} />
                    {enhancing ? "Enhancing…" : "Enhance quality"}
                  </Button>
                )}
                {piece.status === "draft" && (
                  <Button variant="outline" size="sm" onClick={handleMarkReady}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark ready
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
              {editing && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileCode2 className="h-3.5 w-3.5" />
                  Markdown + live preview
                </span>
              )}
            </div>

            {editing ? (
              <div className="min-h-[520px]">
                <div className="grid sm:grid-cols-2 gap-4 px-4 py-3 border-b border-border bg-muted/20">
                  {piece.status !== "published" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-status" className="text-xs text-muted-foreground">
                        Status
                      </Label>
                      <Select value={statusDraft} onValueChange={setStatusDraft}>
                        <SelectTrigger id="edit-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-planned-date" className="text-xs text-muted-foreground">
                      Planned date (optional)
                    </Label>
                    <input
                      id="edit-planned-date"
                      type="date"
                      value={plannedDateDraft}
                      onChange={(e) => setPlannedDateDraft(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                    />
                  </div>
                </div>
                {editingPreview ? (
                  <div className="px-6 py-8 lg:px-10 lg:py-10">
                    <ContentMarkdown>{bodyDraft || "_Nothing to preview yet._"}</ContentMarkdown>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Label className="text-xs text-muted-foreground">Markdown source</Label>
                        <MarkdownToolbar
                          textareaRef={bodyTextareaRef}
                          value={bodyDraft}
                          onChange={setBodyDraft}
                        />
                      </div>
                      <Textarea
                        ref={bodyTextareaRef}
                        className="min-h-[460px] font-mono text-sm leading-relaxed resize-none border-0 shadow-none focus-visible:ring-0 p-0"
                        value={bodyDraft}
                        onChange={(e) => setBodyDraft(e.target.value)}
                      />
                    </div>
                    <div className="p-6 bg-muted/10 overflow-y-auto max-h-[640px]">
                      <Label className="text-xs text-muted-foreground mb-3 block">Live preview</Label>
                      <ContentMarkdown>{bodyDraft || "_Start writing to see formatted preview._"}</ContentMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-6 py-8 lg:px-10 lg:py-10">
                {displayBody ? (
                  <ContentMarkdown>{displayBody}</ContentMarkdown>
                ) : (
                  <p className="text-sm text-muted-foreground">No content yet. Regenerate or edit to add copy.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          {visualSummaryMarkdown && canEnhance && (
            <div className="paper-card p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                Visual summary
              </div>
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                <ContentMarkdown>{visualSummaryMarkdown}</ContentMarkdown>
              </div>
            </div>
          )}

          {displayBody && (
            <ArticleQualityPanel
              bodyMarkdown={displayBody}
              metaTitle={displayTitle}
              seoTitle={piece.pieceMetadata?.seoTitle}
              metaDescription={piece.pieceMetadata?.metaDescription}
              ogTitle={piece.pieceMetadata?.ogTitle}
              ogDescription={piece.pieceMetadata?.ogDescription}
              focusKeyword={piece.pieceMetadata?.focusKeyword ?? piece.targetKeyword}
              citations={piece.pieceMetadata?.citations}
              faqSection={piece.pieceMetadata?.faqSection}
              jsonLdSchema={piece.pieceMetadata?.jsonLdSchema}
              internalLinkSuggestions={piece.pieceMetadata?.internalLinkSuggestions}
              wordCount={displayWordCount}
              canEnhance={canEnhance}
              enhancing={enhancing}
              onEnhance={handleEnhance}
            />
          )}

          <div className="paper-card p-4 rounded-xl space-y-3">
            <Label className="text-sm font-medium">Publish</Label>
            <Select
              value={publishPlatform}
              onValueChange={(v) => setPublishPlatform(v as PublishDestinationId)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {publishDestinations.map((d) => (
                  <SelectItem
                    key={d.id}
                    value={d.id}
                    disabled={d.exportOnly || !d.isConnected(cmsConnections)}
                  >
                    {d.label}
                    {d.exportOnly
                      ? " (export only)"
                      : !d.isConnected(cmsConnections)
                        ? " (not connected)"
                        : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                size="sm"
                onClick={handlePublishPreview}
                disabled={previewLoading || connectedDestinations.length === 0}
              >
                <Eye className="h-4 w-4" /> {previewLoading ? "Previewing…" : "Preview"}
              </Button>
              <Button
                className="flex-1"
                size="sm"
                onClick={handlePublish}
                disabled={publishing || connectedDestinations.length === 0}
              >
                <Send className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
            {(previewKind || previewWarnings.length > 0) && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
                {previewKind && (
                  <p className="text-muted-foreground">
                    Destination format: <span className="font-medium text-foreground">{previewKind}</span>
                  </p>
                )}
                {previewWarnings.map((w) => (
                  <p key={w.code} className="flex gap-1.5 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {w.message}
                  </p>
                ))}
                {previewHtml && (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none max-h-48 overflow-y-auto border-t border-border pt-2 mt-2"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                )}
                {!previewHtml && previewJson != null && (
                  <pre className="max-h-48 overflow-y-auto border-t border-border pt-2 mt-2 text-[11px] font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(previewJson, null, 2)}
                  </pre>
                )}
              </div>
            )}
            {connectedDestinations.length === 0 && (
              <Link
                href="/integrations"
                className="block text-xs text-primary hover:underline"
              >
                Connect a destination
              </Link>
            )}
          </div>
        </aside>
      </div>

      <ContentPieceRepurposeDialog
        open={repurposeOpen}
        onClose={() => setRepurposeOpen(false)}
        pieceId={piece.id}
        projectId={piece.websiteProjectId}
        currentFormat={piece.formatType}
      />
    </div>
  );
}
