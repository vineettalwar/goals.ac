export type SocialPieceImageMeta = {
  featuredImageUrl?: string | null;
  ogImageUrl?: string | null;
  images?: Array<{
    role?: string;
    remoteUrl?: string;
    publishedUrl?: string;
  }>;
};

export type SocialQueueItem = {
  id: number;
  title: string;
  formatType: string;
  platform: string | null;
  approvalStatus: string;
  status: string;
  scheduledAt: string | null;
  bodyMarkdown?: string;
  pieceMetadata?: SocialPieceImageMeta | null;
};

export type SocialQueueResponse = {
  items: SocialQueueItem[];
};

export type SocialPerformanceRow = {
  contentPieceId: number;
  title: string;
  platform: string;
  publishedUrl: string | null;
  scheduledAt: string | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  syncedAt: string | null;
};

export type SocialMetricsTotals = {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
};

export type SocialMetricsResponse = {
  rows: SocialPerformanceRow[];
  totals: SocialMetricsTotals;
};

export const SOCIAL_PLATFORM_OPTIONS = [
  { id: "linkedin", label: "LinkedIn", limit: 3000 },
  { id: "twitter", label: "X / Twitter", limit: 280 },
  { id: "instagram", label: "Instagram", limit: 2200 },
  { id: "facebook", label: "Facebook", limit: 63206 },
  { id: "bluesky", label: "Bluesky", limit: 300 },
  { id: "mastodon", label: "Mastodon", limit: 500 },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORM_OPTIONS)[number]["id"];

const FORMAT_TO_PLATFORM: Record<string, SocialPlatformId> = {
  linkedin_post: "linkedin",
  twitter_thread: "twitter",
  instagram_post: "instagram",
  facebook_post: "facebook",
  bluesky_post: "bluesky",
  mastodon_post: "mastodon",
};

/** Resolve platform id from publishPlatform / platform / formatType. */
export function resolveSocialPlatformId(piece: {
  platform?: string | null;
  publishPlatform?: string | null;
  formatType?: string | null;
}): SocialPlatformId | null {
  const raw = piece.platform ?? piece.publishPlatform;
  if (raw && SOCIAL_PLATFORM_OPTIONS.some((p) => p.id === raw)) {
    return raw as SocialPlatformId;
  }
  if (piece.formatType && FORMAT_TO_PLATFORM[piece.formatType]) {
    return FORMAT_TO_PLATFORM[piece.formatType];
  }
  return null;
}

export function getSocialPlatformLimit(platformId: string | null | undefined): number {
  const opt = SOCIAL_PLATFORM_OPTIONS.find((p) => p.id === platformId);
  return opt?.limit ?? 3000;
}

export function socialPostCharCount(body: string | null | undefined): number {
  return (body ?? "").length;
}

export function isSocialOverCharLimit(
  body: string | null | undefined,
  platformId: string | null | undefined,
): boolean {
  return socialPostCharCount(body) > getSocialPlatformLimit(platformId);
}

export type PlatformVoiceProfile = {
  channels: Record<
    string,
    {
      writingExamples: string[];
      typicalStructure: string;
      hookPatterns: string[];
      doWords: string[];
      dontWords: string[];
      voiceTraits: string[];
      lastAnalyzedAt?: string;
    }
  >;
};

export type ScheduleSettings = {
  timezone: string;
  bestTimeMode: string;
  platforms: Record<
    string,
    {
      enabled?: boolean;
      slotsPerWeek?: number;
      requireApproval?: boolean;
      preferredDays?: number[];
      preferredTimes?: string[];
      minHoursBetweenPosts?: number;
    }
  >;
};

export type HistorySyncPlatformStatus = {
  connected?: boolean;
  lastSyncedAt?: string;
  postCount?: number;
  error?: string;
};

export type SocialComposerParent = {
  id: number;
  title: string;
  formatType: string;
  bodyMarkdown: string;
  pieceMetadata?: SocialPieceImageMeta | null;
};

export type SocialComposedPiece = {
  id: number;
  title: string;
  bodyMarkdown: string;
  formatType: string;
  publishPlatform: string | null;
  scheduledAt: string | null;
  pieceMetadata?: SocialPieceImageMeta | null;
};

/** Matches publishPieceToSocial / connector copy when Instagram has no image. */
export const INSTAGRAM_IMAGE_REQUIRED_MESSAGE =
  "Instagram posts need an image. Add a featured image or include one in the draft.";

/** First markdown image URL in a draft body (`![alt](https://...)`). */
export function extractMarkdownImageUrl(markdown: string | null | undefined): string | undefined {
  const match = (markdown ?? "").match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  return match?.[1];
}

/** True for http(s) URLs Meta/Instagram can fetch (`image_url`). Rejects data: URIs. */
export function isPublicHttpImageUrl(url?: string | null): boolean {
  const trimmed = url?.trim();
  return Boolean(trimmed && /^https?:\/\//i.test(trimmed));
}

function socialPieceImageCandidates(piece: {
  bodyMarkdown?: string | null;
  featuredImageUrl?: string | null;
  pieceMetadata?: SocialPieceImageMeta | null;
}): string[] {
  const out: string[] = [];
  const push = (url?: string | null) => {
    const trimmed = url?.trim();
    if (trimmed) out.push(trimmed);
  };

  push(piece.featuredImageUrl);

  const featured = piece.pieceMetadata?.images?.find((img) => img.role === "featured");
  push(featured?.publishedUrl);
  push(featured?.remoteUrl);
  push(piece.pieceMetadata?.featuredImageUrl);

  push(extractMarkdownImageUrl(piece.bodyMarkdown));

  for (const img of piece.pieceMetadata?.images ?? []) {
    push(img.publishedUrl);
    push(img.remoteUrl);
  }

  push(piece.pieceMetadata?.ogImageUrl);
  return out;
}

/** Resolve a featured/stock/markdown image URL for social preflight + publish hints. */
export function resolveSocialPieceImageUrl(piece: {
  bodyMarkdown?: string | null;
  featuredImageUrl?: string | null;
  pieceMetadata?: SocialPieceImageMeta | null;
}): string | undefined {
  return socialPieceImageCandidates(piece)[0];
}

/**
 * Instagram / Meta Graph need a publicly fetchable http(s) URL.
 * Stock enrich injects HTTPS; visual-summary PNG featured is `data:image/png` (in-app / WP only).
 */
export function resolveSocialPiecePublicImageUrl(piece: {
  bodyMarkdown?: string | null;
  featuredImageUrl?: string | null;
  pieceMetadata?: SocialPieceImageMeta | null;
}): string | undefined {
  return socialPieceImageCandidates(piece).find((url) => isPublicHttpImageUrl(url));
}

export function socialPieceNeedsInstagramImage(piece: {
  platform?: string | null;
  publishPlatform?: string | null;
  formatType?: string | null;
}): boolean {
  const platform = piece.platform ?? piece.publishPlatform;
  if (platform === "instagram") return true;
  return piece.formatType === "instagram_post";
}

export type SocialHubTab =
  | "queue"
  | "calendar"
  | "compose"
  | "analytics"
  | "voice"
  | "settings";

const SOCIAL_HUB_TABS = new Set<SocialHubTab>([
  "queue",
  "calendar",
  "compose",
  "analytics",
  "voice",
  "settings",
]);

export function parseSocialHubTab(value: string | null | undefined): SocialHubTab {
  if (value && SOCIAL_HUB_TABS.has(value as SocialHubTab)) {
    return value as SocialHubTab;
  }
  return "queue";
}

export type SocialNotify = (level: "success" | "error", message: string) => void;

export const WEEK_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const SOCIAL_FORMAT_TYPES = new Set([
  "linkedin_post",
  "twitter_thread",
  "instagram_post",
  "facebook_post",
  "bluesky_post",
  "mastodon_post",
]);

export function socialContentPiecePath(
  projectId: string | number,
  pieceId: number | string,
): string {
  return `/projects/${projectId}/content-piece/${pieceId}`;
}
