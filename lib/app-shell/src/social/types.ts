export type SocialQueueItem = {
  id: number;
  title: string;
  formatType: string;
  platform: string | null;
  approvalStatus: string;
  status: string;
  scheduledAt: string | null;
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
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X / Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "bluesky", label: "Bluesky" },
  { id: "mastodon", label: "Mastodon" },
] as const;
