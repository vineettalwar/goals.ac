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
  intendedOutputMode?: string | null;
  intendedEditorMode?: string | null;
  intendedPublishPlatform?: string | null;
  secondaryKeywords?: string[] | null;
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
  return longform.has(formatType);
}

export function contentPieceSupportsStockImages(formatType: string): boolean {
  return contentPieceCanEnhance(formatType) || isHumanizableSocialFormat(formatType);
}

export function contentPieceCanEdit(status: string): boolean {
  return status !== "generating" && status !== "published";
}

export function contentPieceCanMarkReady(status: string, bodyMarkdown?: string | null): boolean {
  return status === "draft" && Boolean(bodyMarkdown?.trim());
}

export function contentPieceCanDelete(status: string): boolean {
  return status !== "generating";
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
