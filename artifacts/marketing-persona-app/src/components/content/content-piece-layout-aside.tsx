"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Send, Eye, AlertTriangle, LayoutTemplate, Share2, Loader2 } from "lucide-react";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { sanitizeJsonForDisplay } from "@/lib/security/json-ld";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentMarkdown } from "@/components/content/content-markdown";
import { ArticleQualityPanel } from "@/components/content/article-quality-panel";
import { ContentBriefPanel } from "@workspace/app-shell/content-piece";
import type { PublishDestinationId } from "@/lib/projects/publishing-destinations";

type DualScore = {
  serp: { gaps: string[] };
  competitorDiff?: Array<{ title: string; covered: boolean; overlap: number }>;
};

async function fetchDualScore(contentPieceId: number): Promise<DualScore | null> {
  const res = await fetch(`/api/content-pieces/${contentPieceId}/serp-score`);
  if (!res.ok) return null;
  return res.json() as Promise<DualScore>;
}

export function ContentPieceLayoutAside(p: Record<string, unknown>) {
  const {
    piece,
    publishDestinations,
    connectedDestinations,
    publishPlatform,
    setPublishPlatform,
    publishing,
    previewLoading,
    previewHtml,
    previewJson,
    previewWarnings,
    previewKind,
    visualSummaryMarkdown,
    visualSummarySvgSrc,
    canEnhance,
    enhancing,
    handleEnhance,
    handlePublishPreview,
    handlePublish,
    displayBody,
    displayTitle,
    displayWordCount,
    editing,
    cmsConnections,
    canQueueSocial,
    queueingSocial,
    handleQueueSocial,
    setBodyDraft,
  } = p as {
    piece: {
      id?: number;
      briefId?: number | null;
      websiteProjectId?: string | number;
      pieceMetadata?: Record<string, unknown>;
      targetKeyword?: string;
      bodyMarkdown?: string | null;
    };
    publishDestinations: Array<{
      id: string;
      label: string;
      exportOnly?: boolean;
      isConnected: (c: unknown) => boolean;
    }>;
    connectedDestinations: unknown[];
    publishPlatform: string;
    setPublishPlatform: (v: PublishDestinationId) => void;
    publishing: boolean;
    previewLoading: boolean;
    previewHtml: string | null;
    previewJson: unknown;
    previewWarnings: Array<{ code: string; message: string }>;
    previewKind: string | null;
    visualSummaryMarkdown: string | null;
    visualSummarySvgSrc?: string | null;
    canEnhance: boolean;
    enhancing: boolean;
    handleEnhance: () => void;
    handlePublishPreview: () => void;
    handlePublish: () => void;
    displayBody: string;
    displayTitle: string;
    displayWordCount: number;
    editing: boolean;
    cmsConnections: unknown;
    canQueueSocial?: boolean;
    queueingSocial?: boolean;
    handleQueueSocial?: () => void | Promise<void>;
    setBodyDraft?: (value: string) => void;
  };

  const contentPieceId = typeof piece.id === "number" ? piece.id : null;
  const savedBodyMarkdown = piece.bodyMarkdown ?? "";
  // SERP half is DB-scoped — do not refetch on each draft keystroke.
  const { data: dual = null } = useQuery({
    queryKey: ["content-piece-serp-score", contentPieceId],
    queryFn: () => fetchDualScore(contentPieceId!),
    enabled: Boolean(contentPieceId),
    staleTime: 30_000,
  });

  const secondaryKeywords = Array.isArray(piece.pieceMetadata?.secondaryKeywords)
    ? (piece.pieceMetadata.secondaryKeywords as string[])
    : null;

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      {(visualSummarySvgSrc || visualSummaryMarkdown) && canEnhance && (
        <div className="paper-card p-4 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LayoutTemplate className="h-4 w-4 text-primary" />
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
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <ContentMarkdown>{visualSummaryMarkdown}</ContentMarkdown>
            </div>
          ) : null}
        </div>
      )}

      <ContentBriefPanel
        briefId={piece.briefId}
        projectId={piece.websiteProjectId}
        pieceTargetKeyword={piece.targetKeyword}
        secondaryKeywords={secondaryKeywords}
        serpGaps={dual?.serp.gaps}
        competitorTopics={dual?.competitorDiff}
        pieceHasBody={Boolean(displayBody?.trim())}
        onInsertOutline={
          !displayBody?.trim() && editing && setBodyDraft
            ? (markdown) => setBodyDraft(markdown)
            : undefined
        }
        ideasHref={
          piece.websiteProjectId
            ? `/projects/${piece.websiteProjectId}/content-studio`
            : "/projects"
        }
        renderLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />

      {displayBody && (
        <ArticleQualityPanel
          bodyMarkdown={displayBody}
          metaTitle={displayTitle}
          seoTitle={piece.pieceMetadata?.seoTitle as string | undefined}
          metaDescription={piece.pieceMetadata?.metaDescription as string | undefined}
          ogTitle={piece.pieceMetadata?.ogTitle as string | undefined}
          ogDescription={piece.pieceMetadata?.ogDescription as string | undefined}
          focusKeyword={(piece.pieceMetadata?.focusKeyword as string | undefined) ?? piece.targetKeyword}
          citations={piece.pieceMetadata?.citations as { text: string; url: string }[] | undefined}
          faqSection={piece.pieceMetadata?.faqSection as { question: string; answer: string }[] | undefined}
          jsonLdSchema={piece.pieceMetadata?.jsonLdSchema as object | null | undefined}
          internalLinkSuggestions={piece.pieceMetadata?.internalLinkSuggestions as { anchorText: string; suggestedSlug: string }[] | undefined}
          wordCount={displayWordCount}
          contentPieceId={contentPieceId}
          savedBodyMarkdown={savedBodyMarkdown}
          showScoreDelta={Boolean(editing)}
          canEnhance={canEnhance}
          enhancing={enhancing}
          onEnhance={handleEnhance}
        />
      )}

      <div className="paper-card p-4 rounded-xl space-y-3">
        <Label className="text-sm font-medium">Publish</Label>
        <Select value={publishPlatform} onValueChange={(v) => setPublishPlatform(v as PublishDestinationId)}>
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
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
              />
            )}
            {!previewHtml && previewJson != null && (
              <pre className="max-h-48 overflow-y-auto border-t border-border pt-2 mt-2 text-[11px] font-mono whitespace-pre-wrap break-all">
                {sanitizeJsonForDisplay(previewJson, 2)}
              </pre>
            )}
          </div>
        )}
        {connectedDestinations.length === 0 && (
          <Link
            href={
              piece.websiteProjectId
                ? `/projects/${piece.websiteProjectId}/integrations`
                : "/integrations"
            }
            className="block text-xs text-primary hover:underline"
          >
            Connect a destination
          </Link>
        )}
        {canQueueSocial && handleQueueSocial ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="sm"
            onClick={() => void handleQueueSocial()}
            disabled={queueingSocial || editing}
            title="Create LinkedIn and X variants and open Social Hub"
          >
            {queueingSocial ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {queueingSocial ? "Queuing…" : "Queue social"}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
