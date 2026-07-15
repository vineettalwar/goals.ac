"use client";

import Link from "next/link";
import { ExternalLink, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import { FormatBadge, StatusBadge } from "./content-studio-format-meta";
import { ArticlePerformanceBadge } from "./article-performance-badge";
import { cn } from "@/lib/utils";
import type { StudioPiece } from "./content-studio-utils";

export function FilterSelect({
  value,
  onChange,
  options,
  icon,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  icon?: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
      <select
        aria-label={ariaLabel}
        className={cn("h-8 rounded-lg border border-dashed border-input bg-card text-xs px-2", icon && "pl-7")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function StudioPieceCard({
  piece,
  projectId,
  onDelete,
  onMarkReady,
}: {
  piece: StudioPiece;
  projectId: string;
  onDelete: (id: number) => void;
  onMarkReady: (id: number) => void;
}) {
  return (
    <div className="paper-card rounded-xl p-5 flex items-start justify-between gap-4 group">
      <div className="min-w-0 flex-1">
        <Link href={contentPiecePath(projectId, piece.id)} className="font-medium hover:text-primary truncate block">
          {piece.title}
        </Link>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <FormatBadge type={piece.formatType} />
          {piece.targetKeyword && <span className="text-xs text-muted-foreground">{piece.targetKeyword}</span>}
          <span className="text-xs text-muted-foreground">{piece.wordCount} words</span>
          {piece.plannedDate && (
            <span className="text-xs text-muted-foreground">· {piece.plannedDate}</span>
          )}
          <ArticlePerformanceBadge
            projectId={projectId}
            contentPieceId={piece.id}
            publishedUrl={piece.publishedUrl}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={piece.status} />
        {piece.status === "draft" && (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Mark ready" onClick={() => onMarkReady(piece.id)}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" title="Delete" onClick={() => onDelete(piece.id)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
        <Link href={contentPiecePath(projectId, piece.id)}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
