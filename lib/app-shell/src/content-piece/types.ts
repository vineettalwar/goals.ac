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
  humanizationAudit?: {
    slopScoreBefore?: number;
    slopScoreAfter?: number;
    rejected?: boolean;
  };
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

/** SPA studio list back link (not the Next.js project-scoped content studio route). */
export function contentStudioBackHref(projectId: number | string): string {
  return `/studio?project=${projectId}`;
}

export function contentPieceCanPublish(status: string): boolean {
  return status === "ready";
}

export function contentPieceCanGenerate(status: string): boolean {
  return status === "draft" || status === "pending" || status === "failed";
}

export function contentPieceCanHumanize(formatType: string): boolean {
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
  return longform.has(formatType) || formatType === "linkedin_post";
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
  return contentPieceCanEnhance(formatType) || formatType === "linkedin_post";
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
