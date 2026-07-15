"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, FileText, ListTree, PenLine } from "lucide-react";

export type ContentBriefSummary = {
  id: number;
  workingTitle: string;
  angle?: string | null;
  outline?: unknown;
  targetKeywordCluster?: string | null;
};

export type ContentBriefSerpTopic = {
  title: string;
  covered: boolean;
};

export type ContentBriefPanelProps = {
  briefId?: number | null;
  projectId?: number | string | null;
  /** Piece-level keyword fallback when brief has no cluster. */
  pieceTargetKeyword?: string | null;
  /** Optional secondary terms from piece metadata. */
  secondaryKeywords?: string[] | null;
  /** Host fetches GET /api/briefs/:id (cookie or JWT). */
  fetchBrief?: (briefId: number) => Promise<ContentBriefSummary | null>;
  /** Compact SERP gaps — reuse dual-score payload already fetched nearby. */
  serpGaps?: string[] | null;
  competitorTopics?: ContentBriefSerpTopic[] | null;
  /** Empty-state link to ideas / studio. */
  ideasHref?: string | null;
  /** When the piece already has body, skip create-from-brief CTA. */
  pieceHasBody?: boolean;
  /** Optional callback to insert outline into draft when body is empty. */
  onInsertOutline?: (outlineMarkdown: string) => void;
  renderLink?: (props: {
    href: string;
    className?: string;
    children: ReactNode;
  }) => ReactNode;
};

function splitKeywordCluster(cluster: string | null | undefined): string[] {
  if (!cluster?.trim()) return [];
  return cluster
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Normalize briefs.outline jsonb (string[], objects, or plain string) into bullets. */
export function normalizeBriefOutline(outline: unknown): string[] {
  if (outline == null) return [];
  if (typeof outline === "string") {
    return outline
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }
  if (!Array.isArray(outline)) return [];
  const bullets: string[] = [];
  for (const item of outline) {
    if (typeof item === "string" && item.trim()) {
      bullets.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const row = item as Record<string, unknown>;
      const heading =
        (typeof row.heading === "string" && row.heading) ||
        (typeof row.title === "string" && row.title) ||
        (typeof row.text === "string" && row.text) ||
        (typeof row.h2 === "string" && row.h2) ||
        null;
      if (heading?.trim()) bullets.push(heading.trim());
    }
  }
  return bullets;
}

/** Convert outline bullets to markdown H2 list. */
function outlineToMarkdown(bullets: string[]): string {
  return bullets.map((bullet) => `## ${bullet}`).join("\n\n");
}

async function defaultFetchBrief(briefId: number): Promise<ContentBriefSummary | null> {
  const res = await fetch(`/api/briefs/${briefId}`);
  if (!res.ok) return null;
  return (await res.json()) as ContentBriefSummary;
}

export function ContentBriefPanel({
  briefId,
  projectId,
  pieceTargetKeyword,
  secondaryKeywords,
  fetchBrief = defaultFetchBrief,
  serpGaps,
  competitorTopics,
  ideasHref,
  pieceHasBody = false,
  renderLink,
}: ContentBriefPanelProps) {
  const [brief, setBrief] = useState<ContentBriefSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(briefId));
  const [loadFailed, setLoadFailed] = useState(false);
  const fetchBriefRef = useRef(fetchBrief);
  fetchBriefRef.current = fetchBrief;

  useEffect(() => {
    if (!briefId) {
      setBrief(null);
      setLoading(false);
      setLoadFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    void fetchBriefRef
      .current(briefId)
      .then((data) => {
        if (cancelled) return;
        setBrief(data);
        setLoadFailed(!data);
      })
      .catch(() => {
        if (cancelled) return;
        setBrief(null);
        setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [briefId]);

  const studioHref =
    ideasHref ??
    (projectId != null && projectId !== ""
      ? `/projects/${projectId}/content-studio`
      : "/projects");

  const createFromBriefHref =
    briefId && projectId != null && projectId !== ""
      ? `/projects/${projectId}/content-studio?briefId=${briefId}`
      : null;

  const clusterParts = splitKeywordCluster(brief?.targetKeywordCluster);
  const primaryKeyword =
    clusterParts[0] || pieceTargetKeyword?.trim() || null;
  const secondaryFromCluster = clusterParts.slice(1);
  const secondary =
    secondaryKeywords && secondaryKeywords.length > 0
      ? secondaryKeywords
      : secondaryFromCluster;
  const outlineBullets = normalizeBriefOutline(brief?.outline);
  const gapPreview = (serpGaps ?? []).slice(0, 3);
  const topicPreview = (competitorTopics ?? []).slice(0, 4);
  const hasSerpContext = gapPreview.length > 0 || topicPreview.length > 0;

  const link = (href: string, className: string, children: ReactNode) =>
    renderLink ? (
      renderLink({ href, className, children })
    ) : (
      <a href={href} className={className}>
        {children}
      </a>
    );

  if (!briefId) {
    return (
      <div className="paper-card space-y-2 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          Brief
        </div>
        <p className="text-xs text-muted-foreground">No brief linked</p>
        {link(studioHref, "text-xs text-primary hover:underline", "Browse ideas")}
      </div>
    );
  }

  return (
    <div className="paper-card space-y-3 rounded-xl p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" aria-hidden />
        Brief context
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading brief…</p>
      ) : loadFailed || !brief ? (
        <p className="text-xs text-muted-foreground">Could not load brief.</p>
      ) : (
        <div className="space-y-3">
          {brief.workingTitle ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Working title
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug">{brief.workingTitle}</p>
            </div>
          ) : null}

          {brief.angle?.trim() ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Angle
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{brief.angle}</p>
            </div>
          ) : null}

          {primaryKeyword ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Target keyword
              </p>
              <p className="mt-0.5 text-sm font-medium">{primaryKeyword}</p>
            </div>
          ) : null}

          {secondary.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Secondary keywords
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {secondary.join(" · ")}
              </p>
            </div>
          ) : null}

          {outlineBullets.length > 0 ? (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ListTree className="h-3 w-3" aria-hidden />
                Outline
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {outlineBullets.slice(0, 8).map((bullet) => (
                  <li key={bullet} className="flex gap-1.5">
                    <span className="shrink-0 text-muted-foreground/70">•</span>
                    <span className="leading-snug">{bullet}</span>
                  </li>
                ))}
              </ul>
              {!pieceHasBody && createFromBriefHref
                ? link(
                    createFromBriefHref,
                    "mt-2 inline-block text-xs text-primary hover:underline",
                    "Create from brief",
                  )
                : null}
            </div>
          ) : null}
        </div>
      )}

      {hasSerpContext ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            SERP context
          </p>
          {gapPreview.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {gapPreview.map((gap) => (
                <li key={gap}>• {gap}</li>
              ))}
            </ul>
          ) : null}
          {topicPreview.length > 0 ? (
            <ul className="space-y-1 text-xs">
              {topicPreview.map((row) => (
                <li key={row.title} className="flex items-start justify-between gap-2">
                  <span className={row.covered ? "text-muted-foreground" : ""}>{row.title}</span>
                  <span
                    className={
                      row.covered
                        ? "shrink-0 font-medium text-emerald-700"
                        : "shrink-0 font-medium text-amber-700"
                    }
                  >
                    {row.covered ? "Covered" : "Gap"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
