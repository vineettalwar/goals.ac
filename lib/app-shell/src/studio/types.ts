import type { ReactNode } from "react";

export type StudioLinkProps = {
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
};

export type StudioPiece = {
  id: number;
  title: string;
  formatType: string;
  targetKeyword?: string | null;
  status: string;
  wordCount: number;
  plannedDate?: string | null;
  publishedUrl?: string | null;
  createdAt?: string | number | null;
  updatedAt?: string | number | null;
};

/** Pre-studio content surfaced in the hub (SEO articles, strategies, audits, roadmaps). */
export type LegacyItem = {
  id: number;
  title: string;
  keyword: string;
  wordCount: number;
  status: string;
  createdAt: string;
  source: "seo_article" | "content_strategy" | "geo_audit" | "roadmap";
  linkTo: string;
  subtitle?: string;
};

export type StudioSortKey = "newest" | "oldest" | "words_desc" | "words_asc" | "title_asc";

export const STUDIO_FORMAT_OPTIONS = [
  { value: "blog_post", label: "Blog Post" },
  { value: "news_article", label: "News Article" },
  { value: "tutorial", label: "Tutorial" },
  { value: "guide", label: "Guide" },
  { value: "whitepaper", label: "Whitepaper" },
  { value: "pillar_page", label: "Pillar Page" },
  { value: "location_page", label: "Location Page" },
  { value: "infographic_outline", label: "Infographic Outline" },
  { value: "linkedin_post", label: "LinkedIn Post" },
  { value: "twitter_thread", label: "Twitter Thread" },
  { value: "instagram_post", label: "Instagram Post" },
  { value: "facebook_post", label: "Facebook Post" },
  { value: "bluesky_post", label: "Bluesky Post" },
  { value: "mastodon_post", label: "Mastodon Post" },
  { value: "email_sequence", label: "Email Sequence" },
  { value: "ad_copy", label: "Ad Copy" },
  { value: "landing_page_copy", label: "Landing Page" },
  { value: "product_description", label: "Product Description" },
  { value: "press_release", label: "Press Release" },
  { value: "faq_article", label: "FAQ Article" },
] as const;

const FORMAT_LABELS: Record<string, string> = Object.fromEntries(
  STUDIO_FORMAT_OPTIONS.map((option) => [option.value, option.label]),
);

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  published: "Published",
  prepared: "Prepared",
  generating: "Generating",
  failed: "Failed",
};

export function studioContentPiecePath(
  projectId: number | string,
  pieceId: number | string,
): string {
  return `/projects/${projectId}/content-piece/${pieceId}`;
}

export function studioProjectPath(projectId: number | string): string {
  return `/projects/${projectId}`;
}

export function studioHubPath(projectId: number | string): string {
  return `/projects/${projectId}/content-studio`;
}

export function formatTypeLabel(formatType: string): string {
  return (
    FORMAT_LABELS[formatType] ??
    formatType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function statusLabel(status: string): string {
  return (
    STATUS_LABELS[status] ??
    status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function pieceTimestamp(piece: StudioPiece): number {
  const raw = piece.updatedAt ?? piece.createdAt;
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortStudioPieces(pieces: StudioPiece[], sortKey: StudioSortKey): StudioPiece[] {
  return [...pieces].sort((a, b) => {
    switch (sortKey) {
      case "newest":
        return pieceTimestamp(b) - pieceTimestamp(a);
      case "oldest":
        return pieceTimestamp(a) - pieceTimestamp(b);
      case "words_desc":
        return (b.wordCount ?? 0) - (a.wordCount ?? 0);
      case "words_asc":
        return (a.wordCount ?? 0) - (b.wordCount ?? 0);
      case "title_asc":
        return (a.title ?? "").localeCompare(b.title ?? "");
      default:
        return 0;
    }
  });
}

export function filterStudioPieces(
  pieces: StudioPiece[],
  filterStatus: string,
  filterFormat: string,
): StudioPiece[] {
  return pieces.filter((piece) => {
    if (filterStatus !== "all" && piece.status !== filterStatus) return false;
    if (filterFormat !== "all" && piece.formatType !== filterFormat) return false;
    return true;
  });
}

export function studioStatusCounts(pieces: StudioPiece[]): Array<{ label: string; count: number; color: string }> {
  const draft = pieces.filter((piece) => piece.status === "draft").length;
  const ready = pieces.filter((piece) => piece.status === "ready").length;
  const published = pieces.filter((piece) => piece.status === "published").length;
  const rows = [
    { label: "Drafts", count: draft, color: "text-amber-600" },
    { label: "Ready", count: ready, color: "text-emerald-600" },
    { label: "Published", count: published, color: "text-blue-600" },
  ];
  return rows.filter((row) => row.count > 0);
}
