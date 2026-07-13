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
import { FORMAT_OPTIONS } from "@/lib/content-format-options";
import {
  type ContentFormatType,
  type PublishDestinationId,
  getConnectedDestinationsForFormat,
  getDestinationsForFormat,
  type CmsConnectionSnapshot,
} from "@/lib/publishing-destinations";
import type { ContentPieceRecord } from "@/lib/server/loaders";
import { ArticlePerformanceBadge } from "@/components/content-studio/article-performance-badge";
import { cn } from "@/lib/utils";

interface ContentPieceClientProps {
  pieceId: string;
  initialPiece: ContentPieceRecord;
  initialCmsConnections: CmsConnectionSnapshot;
}

function defaultPublishPlatform(
  formatType: string,
  connections: CmsConnectionSnapshot,
): PublishDestinationId {
  const connected = getConnectedDestinationsForFormat(formatType as ContentFormatType, connections);
  return connected[0]?.id ?? "wordpress";
}

export function ContentPieceClient({
  pieceId,
  initialPiece,
  initialCmsConnections,
}: ContentPieceClientProps) {
  const router = useRouter();
  const [piece, setPiece] = useState(initialPiece);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bodyDraft, setBodyDraft] = useState(initialPiece.bodyMarkdown ?? "");
  const [titleDraft, setTitleDraft] = useState(initialPiece.title ?? "");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [repurposeFormat, setRepurposeFormat] = useState("");
  const [repurposing, setRepurposing] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState<PublishDestinationId>(() =>
    defaultPublishPlatform(initialPiece.formatType, initialCmsConnections),
  );
  const [cmsConnections] = useState(initialCmsConnections);
  const [deleting, setDeleting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [regeneratingImages, setRegeneratingImages] = useState(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const featuredImage = piece.pieceMetadata?.images?.find((img) => img.role === "featured");

  const displayBody = editing ? bodyDraft : piece.bodyMarkdown;
  const displayTitle = editing ? titleDraft : piece.title;
  const displayWordCount = useMemo(
    () => (editing ? bodyDraft.split(/\s+/).filter(Boolean).length : piece.wordCount),
    [editing, bodyDraft, piece.wordCount],
  );

  const canEnhance = isSeoLongformFormat(piece.formatType as ContentFormatType);
  const qualityScore = useMemo(
    () =>
      scoreArticleQuality({
        bodyMarkdown: displayBody,
        metaTitle: displayTitle,
        metaDescription: piece.pieceMetadata?.metaDescription,
        citations: piece.pieceMetadata?.citations,
        faqSection: piece.pieceMetadata?.faqSection,
        jsonLdSchema: piece.pieceMetadata?.jsonLdSchema,
        internalLinkSuggestions: piece.pieceMetadata?.internalLinkSuggestions,
        wordCount: displayWordCount,
      }).total,
    [displayBody, displayTitle, displayWordCount, piece.pieceMetadata],
  );

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft, bodyMarkdown: bodyDraft }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setEditing(false);
    toast.success("Saved");
  }

  function cancelEdit() {
    setTitleDraft(piece.title);
    setBodyDraft(piece.bodyMarkdown);
    setEditing(false);
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
    setEditing(false);
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
    toast.success("Quality enhanced — FAQ, citations, and links added");
  }

  async function handleRepurpose() {
    if (!repurposeFormat) {
      toast.error("Select a target format");
      return;
    }
    setRepurposing(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/repurpose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetFormat: repurposeFormat }),
    });
    setRepurposing(false);
    if (!res.ok) {
      toast.error("Repurpose failed");
      return;
    }
    const newPiece = await res.json();
    toast.success("Repurposed — opening new piece");
    router.push(`/content-piece/${newPiece.id}`);
  }

  async function regenerateImages() {
    setRegeneratingImages(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/images/regenerate`, { method: "POST" });
    setRegeneratingImages(false);
    if (!res.ok) {
      toast.error("Failed to regenerate images");
      return;
    }
    const data = (await res.json()) as { piece: ContentPieceRecord };
    setPiece(data.piece);
    toast.success("Images updated from keyword search");
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`/api/content-pieces/${pieceId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: publishPlatform }),
    });
    setPublishing(false);
    if (!res.ok) {
      toast.error("Failed to publish");
      return;
    }
    const updated = await res.json();
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
          ) : null}
          <div className="paper-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 bg-muted/30">
              <div className="flex flex-wrap items-center gap-1.5">
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </>
                )}
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
              <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border min-h-[520px]">
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
          {displayBody && (
            <ArticleQualityPanel
              bodyMarkdown={displayBody}
              metaTitle={displayTitle}
              metaDescription={piece.pieceMetadata?.metaDescription}
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
                  <SelectItem key={d.id} value={d.id} disabled={!d.isConnected(cmsConnections)}>
                    {d.label}
                    {!d.isConnected(cmsConnections) ? " (not connected)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              size="sm"
              onClick={handlePublish}
              disabled={publishing || connectedDestinations.length === 0}
            >
              <Send className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish"}
            </Button>
            {connectedDestinations.length === 0 && (
              <Link
                href="/integrations"
                className="block text-xs text-primary hover:underline"
              >
                Connect a destination
              </Link>
            )}
          </div>

          <div className="paper-card p-4 rounded-xl space-y-3">
            <Label className="text-sm font-medium">Repurpose</Label>
            <Select value={repurposeFormat} onValueChange={setRepurposeFormat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select format…" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.filter((o) => o.value !== piece.formatType).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" size="sm" onClick={handleRepurpose} disabled={repurposing}>
              Repurpose
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
