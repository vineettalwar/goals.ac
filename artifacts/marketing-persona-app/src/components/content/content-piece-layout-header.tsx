"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatHumanizationAuditLine } from "@workspace/app-shell/content-piece";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArticlePerformanceBadge } from "@/components/content-studio/article-performance-badge";

export function ContentPieceLayoutHeader({
  piece,
  editing,
  titleDraft,
  setTitleDraft,
  formatLabel,
  displayWordCount,
  humanizationAudit,
}: {
  piece: {
    websiteProjectId: string;
    title: string;
    targetKeyword?: string;
    status: string;
    plannedDate?: string | null;
    id: number;
    publishedUrl?: string | null;
    pieceMetadata?: { humanized?: boolean };
  };
  editing: boolean;
  titleDraft: string;
  setTitleDraft: (v: string) => void;
  formatLabel: string;
  displayWordCount: number;
  humanizationAudit?: {
    rejected?: boolean;
    slopScoreBefore?: number;
    slopScoreAfter?: number;
    reason?: string;
  } | null;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <Link href={`/projects/${piece.websiteProjectId}/content-studio`}>
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            aria-label="Edit title"
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
          {piece.pieceMetadata?.humanized ? (
            <Badge variant="success" title="Passed humanizer rewrite">
              Humanized
            </Badge>
          ) : null}
          {humanizationAudit ? (
            <span className="text-xs text-muted-foreground">
              {formatHumanizationAuditLine(humanizationAudit)}
            </span>
          ) : null}
          {piece.plannedDate && !editing && (
            <span className="text-xs text-muted-foreground">Planned {piece.plannedDate}</span>
          )}
          <ArticlePerformanceBadge
            projectId={String(piece.websiteProjectId)}
            contentPieceId={piece.id}
            publishedUrl={piece.publishedUrl}
          />
          {piece.publishedUrl ? (
            <Link href="/search/performance" className="text-xs text-primary hover:underline">
              View performance
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
