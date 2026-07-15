export type SocialQueueItem = {
  id: number;
  title: string;
  formatType: string;
  platform: string | null;
  approvalStatus: string;
  status: string;
  scheduledAt: string | null;
  bodyMarkdown?: string;
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
};

export type SocialComposedPiece = {
  id: number;
  title: string;
  bodyMarkdown: string;
  formatType: string;
  publishPlatform: string | null;
  scheduledAt: string | null;
};

export type SocialHubTab =
  | "queue"
  | "calendar"
  | "compose"
  | "analytics"
  | "voice"
  | "settings";

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
