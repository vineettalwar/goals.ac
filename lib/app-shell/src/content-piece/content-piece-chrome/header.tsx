import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import {
  contentStudioBackHref,
  formatHumanizationAuditLine,
  type ContentPieceDetail,
} from "../types";
import {
  MetaBadge,
  PieceLink,
  StatusBadge,
  type ContentPieceLinkProps,
} from "./badges";

export function ContentPieceHeader({
  piece,
  editing,
  titleDraft,
  formatLabel,
  wordCount,
  onTitleChange,
  renderLink,
  headerExtra,
}: {
  piece: ContentPieceDetail;
  editing: boolean;
  titleDraft: string;
  formatLabel: string;
  wordCount: number;
  onTitleChange: (value: string) => void;
  renderLink: (props: ContentPieceLinkProps) => ReactNode;
  headerExtra?: ReactNode;
}) {
  const humanizationAudit = piece.pieceMetadata?.humanizationAudit;
  return (
    <div className="mb-2 flex items-start gap-3">
      <PieceLink
        renderLink={renderLink}
        href={contentStudioBackHref(piece.websiteProjectId)}
        className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        <span className="sr-only">Content studio</span>
      </PieceLink>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            type="text"
            value={titleDraft}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full border-b border-border bg-transparent pb-2 text-2xl font-bold leading-tight tracking-tight focus:outline-hidden lg:text-3xl"
            aria-label="Content title"
          />
        ) : (
          <h1 className="text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
            {piece.title}
          </h1>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <MetaBadge>{formatLabel}</MetaBadge>
          {piece.targetKeyword ? <MetaBadge>{piece.targetKeyword}</MetaBadge> : null}
          <span className="text-xs text-muted-foreground">
            {wordCount.toLocaleString()} words
          </span>
          <StatusBadge status={piece.status} />
          {piece.pieceMetadata?.humanized ? <MetaBadge>Humanized</MetaBadge> : null}
          {piece.pieceMetadata?.source === "refresh" ? (
            <MetaBadge>Refresh</MetaBadge>
          ) : null}
          {piece.plannedDate && !editing ? (
            <span className="text-xs text-muted-foreground">Planned {piece.plannedDate}</span>
          ) : null}
          {humanizationAudit ? (
            <span className="text-xs text-muted-foreground">
              {formatHumanizationAuditLine(humanizationAudit)}
            </span>
          ) : null}
          {headerExtra}
        </div>
      </div>
    </div>
  );
}
