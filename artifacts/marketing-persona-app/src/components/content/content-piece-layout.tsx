"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Send, Copy, Check, RefreshCw, Save, Pencil, Trash2, CheckCircle2, FileCode2, TrendingUp, Eye, Shuffle, ImageIcon, AlertTriangle, LayoutTemplate, Sparkles } from "lucide-react";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentMarkdown } from "@/components/content/content-markdown";
import { MarkdownToolbar } from "@/components/content/markdown-toolbar";
import { ArticleQualityPanel } from "@/components/content/article-quality-panel";
import { ArticlePerformanceBadge } from "@/components/content-studio/article-performance-badge";
import { ContentPieceRepurposeDialog } from "@/components/content/content-piece-repurpose-dialog";
import { ContentPieceLayoutAside } from "@/components/content/content-piece-layout-aside";
import { ContentPieceLayoutHeader } from "@/components/content/content-piece-layout-header";
import { cn } from "@/lib/utils";

export function ContentPieceLayout(p: any) {
  const {
    piece, pieceId, editing, editingPreview, displayBody, displayTitle, displayWordCount,
    titleDraft, bodyDraft, statusDraft, plannedDateDraft, formatLabel, qualityScore,
    publishDestinations, connectedDestinations, publishPlatform, setPublishPlatform,
    publishing, saving, regenerating, enhancing, humanizing, regeneratingImages, deleting,
    copied, previewLoading, previewHtml, previewJson, previewWarnings, previewKind,
    repurposeOpen, setRepurposeOpen, featuredImage, supportsStockImages, stockImagesConfigured,
    canEnhance, canHumanize, humanizationAudit, visualSummaryMarkdown, seoTitle,
    bodyTextareaRef, handleSave, cancelEdit, startEdit, handleRegenerate, handleEnhance,
    handleHumanize, regenerateImages, handlePublishPreview, handlePublish, handleDelete,
    handleMarkReady, handleCopy, setEditingPreview, setTitleDraft, setBodyDraft,
    setStatusDraft, setPlannedDateDraft, router,
  } = p;
  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
      <ContentPieceLayoutHeader
        piece={piece}
        editing={editing}
        titleDraft={titleDraft}
        setTitleDraft={setTitleDraft}
        formatLabel={formatLabel}
        displayWordCount={displayWordCount}
        humanizationAudit={humanizationAudit}
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          {featuredImage ? (
            <div className="paper-card rounded-xl p-4 flex flex-col sm:flex-row gap-4">
              <Image
                src={featuredImage.publishedUrl ?? featuredImage.remoteUrl}
                alt={featuredImage.alt}
                title={featuredImage.title}
                width={192}
                height={128}
                unoptimized
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
                      onClick={() => setEditingPreview((v: boolean) => !v)}
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
                    disabled={enhancing || regenerating || humanizing}
                    title="Add FAQ, citations, and internal links without rewriting from scratch"
                  >
                    <TrendingUp className={cn("h-3.5 w-3.5", enhancing && "animate-pulse")} />
                    {enhancing ? "Enhancing…" : "Enhance quality"}
                  </Button>
                )}
                {canHumanize && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleHumanize}
                    disabled={humanizing || regenerating || enhancing}
                    title="Rewrite for natural human rhythm without full regeneration"
                  >
                    <Sparkles className={cn("h-3.5 w-3.5", humanizing && "animate-pulse")} />
                    {humanizing ? "Humanizing…" : "Re-humanize"}
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
                      aria-label="Planned date (optional)"
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

        <ContentPieceLayoutAside p={p} />
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
