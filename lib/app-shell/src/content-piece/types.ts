import {
  isHumanizableFormat,
  isHumanizableSocialFormat,
} from "@workspace/content-engine/content/humanize-eligibility";
import { SOCIAL_FORMAT_TYPES } from "../social/types";

export type ContentPieceImageRef = {
  role: string;
  provider: string;
  remoteId: string;
  remoteUrl: string;
  alt: string;
  title: string;
  searchQuery: string;
  rankScore: number;
  photographer?: string;
  photographerUrl?: string;
  sectionHeading?: string;
  publishedUrl?: string;
};

export type ContentPieceMetadata = {
  seoTitle?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  featuredImageUrl?: string | null;
  citations?: { text: string; url: string }[];
  faqSection?: { question: string; answer: string }[];
  jsonLdSchema?: object | null;
  internalLinkSuggestions?: { anchorText: string; suggestedSlug: string }[];
  images?: ContentPieceImageRef[];
  humanized?: boolean;
  humanizationAudit?: {
    slopScoreBefore?: number;
    slopScoreAfter?: number;
    rejected?: boolean;
    /** Optional skip reason when rejected (e.g. "length guard") */
    reason?: string;
  };
  /** Generate skipped humanize (e.g. no brand voice sample). */
  humanizeSkippedReason?: string | null;
  /** Body markdown as it was immediately before the most recent humanize pass. */
  preHumanizeBodyMarkdown?: string | null;
  intendedOutputMode?: string | null;
  intendedEditorMode?: string | null;
  intendedPublishPlatform?: string | null;
  secondaryKeywords?: string[] | null;
  visualSummaryMarkdown?: string | null;
  visualSummarySvg?: string | null;
  visualSummarySvgDataUri?: string | null;
  /** Content Refresh Loop — piece imported from a live URL. */
  source?: "refresh" | null;
  sourceUrl?: string | null;
  fetchedCanonicalUrl?: string | null;
  refreshOf?: number | null;
  cmsRemoteId?: string | null;
  cmsRemoteLink?: string | null;
  extractTruncated?: boolean | null;
  updateConfirmed?: boolean | null;
};

export type ContentPieceDetail = {
  id: number;
  websiteProjectId: number;
  title: string;
  status: string;
  formatType: string;
  wordCount: number;
  targetKeyword?: string | null;
  plannedDate?: string | null;
  updatedAt: number | string;
  bodyMarkdown?: string | null;
  pieceMetadata?: ContentPieceMetadata | null;
  briefId?: number | null;
  publishedUrl?: string | null;
};

export type ContentPieceGeneratingState = {
  message: string;
  jobStatus?: string | null;
  jobId?: string | null;
};

export type ContentPiecePublishingState = {
  message: string;
  jobStatus?: string | null;
  jobId?: string | null;
  platform?: string | null;
};

export function formatContentFormatType(formatType: string): string {
  return formatType.replace(/_/g, " ");
}

/** Compact humanization audit line for piece headers. */
export function formatHumanizationAuditLine(audit: {
  slopScoreBefore?: number;
  slopScoreAfter?: number;
  rejected?: boolean;
  reason?: string;
}): string {
  if (audit.rejected) {
    return `skipped: ${audit.reason?.trim() || "length guard"}`;
  }
  const before = audit.slopScoreBefore ?? "?";
  const after = audit.slopScoreAfter ?? "?";
  return `Humanize: ${before}→${after} tells`;
}

export function formatContentPieceUpdatedAt(value: number | string | undefined): string {
  if (value == null) return "—";
  const ms = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function contentStudioBackHref(projectId: number | string): string {
  return `/projects/${projectId}/content-studio`;
}

export function contentPieceCanPublish(status: string): boolean {
  return status === "ready";
}

export function contentPieceCanGenerate(status: string): boolean {
  return status === "draft" || status === "pending" || status === "failed";
}

export function contentPieceCanHumanize(formatType: string): boolean {
  return isHumanizableFormat(formatType);
}

export function contentPieceCanEnhance(formatType: string): boolean {
  const longform = new Set([
    "blog_post",
    "guide",
    "tutorial",
    "pillar_page",
    "whitepaper",
    "faq_article",
    "news_article",
    "location_page",
  ]);
  return longform.has(formatType) || isHumanizableSocialFormat(formatType);
}

export function contentPieceSupportsStockImages(formatType: string): boolean {
  return contentPieceCanEnhance(formatType) || isHumanizableSocialFormat(formatType);
}

export function contentPieceCanEdit(status: string): boolean {
  return status !== "generating" && status !== "published" && status !== "publishing";
}

export function contentPieceCanMarkReady(status: string, bodyMarkdown?: string | null): boolean {
  return status === "draft" && Boolean(bodyMarkdown?.trim());
}

export function contentPieceCanDelete(status: string): boolean {
  return status !== "generating" && status !== "publishing";
}

/** Non-social piece eligible for LinkedIn+X one-click compose (matches Social Hub parent filter). */
export function contentPieceCanQueueSocial(
  formatType: string,
  status: string,
  bodyMarkdown?: string | null,
): boolean {
  if (SOCIAL_FORMAT_TYPES.has(formatType)) return false;
  const body = bodyMarkdown?.trim() ?? "";
  if (!body) return false;
  return status === "ready" || status === "published" || body.length > 50;
}

export type PublishReadyItem = {
  id: "humanize" | "score" | "destination" | "media";
  label: string;
  ok: boolean;
  hint: string;
};

const DEFAULT_SCORE_FLOOR = 55;

/** Soft publish-ready checklist chips (Wave 5.B.3). */
export function buildPublishReadyChecklist(input: {
  humanized?: boolean | null;
  humanizeSkippedReason?: string | null;
  humanizationRejected?: boolean | null;
  editorialScore?: number | null;
  scoreFloor?: number;
  destinationHealthOk?: boolean | null;
  needsFeaturedImage?: boolean;
  hasFeaturedImage?: boolean;
}): PublishReadyItem[] {
  const scoreFloor = input.scoreFloor ?? DEFAULT_SCORE_FLOOR;
  const humanizePassed =
    Boolean(input.humanized) ||
    Boolean(input.humanizeSkippedReason?.trim());

  const scoreOk =
    input.editorialScore == null ? true : input.editorialScore >= scoreFloor;

  const destinationOk =
    input.destinationHealthOk == null ? true : input.destinationHealthOk === true;

  const mediaOk = !input.needsFeaturedImage || Boolean(input.hasFeaturedImage);

  return [
    {
      id: "humanize",
      label: "Humanize",
      ok: humanizePassed,
      hint: input.humanized
        ? "Humanize pass applied"
        : input.humanizeSkippedReason
          ? `Skipped: ${input.humanizeSkippedReason}`
          : input.humanizationRejected
            ? "Last humanize was rejected — retry"
            : "Run Humanize before publish",
    },
    {
      id: "score",
      label: "Score",
      ok: scoreOk,
      hint:
        input.editorialScore == null
          ? "Score pending"
          : scoreOk
            ? `Editorial ${input.editorialScore}`
            : `Editorial ${input.editorialScore} (need ≥${scoreFloor})`,
    },
    {
      id: "destination",
      label: "Destination",
      ok: destinationOk,
      hint:
        input.destinationHealthOk == null
          ? "Health not checked yet"
          : destinationOk
            ? "Destination health OK"
            : "Fix integration health before publish",
    },
    {
      id: "media",
      label: "Media",
      ok: mediaOk,
      hint: mediaOk
        ? input.needsFeaturedImage
          ? "Featured image present"
          : "No featured image required"
        : "Add a public HTTPS featured image",
    },
  ];
}

export function publishReadyChecklistBlocks(items: PublishReadyItem[]): boolean {
  return items.some((item) => !item.ok);
}
