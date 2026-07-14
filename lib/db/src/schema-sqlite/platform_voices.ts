export const SOCIAL_PLATFORM_IDS = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "bluesky",
  "mastodon",
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

export const SOCIAL_FORMAT_TYPES = [
  "linkedin_post",
  "twitter_thread",
  "instagram_post",
  "facebook_post",
  "bluesky_post",
  "mastodon_post",
] as const;

export type SocialFormatType = (typeof SOCIAL_FORMAT_TYPES)[number];

export const FORMAT_TO_SOCIAL_PLATFORM: Record<SocialFormatType, SocialPlatformId> = {
  linkedin_post: "linkedin",
  twitter_thread: "twitter",
  instagram_post: "instagram",
  facebook_post: "facebook",
  bluesky_post: "bluesky",
  mastodon_post: "mastodon",
};

export const SOCIAL_PLATFORM_TO_FORMAT: Record<SocialPlatformId, SocialFormatType> = {
  linkedin: "linkedin_post",
  twitter: "twitter_thread",
  instagram: "instagram_post",
  facebook: "facebook_post",
  bluesky: "bluesky_post",
  mastodon: "mastodon_post",
};

export type PlatformVoiceChannel = {
  writingExamples: string[];
  typicalStructure: string;
  hookPatterns: string[];
  doWords: string[];
  dontWords: string[];
  voiceTraits: string[];
  platformTraits: Record<string, unknown>;
  lastAnalyzedAt?: string;
};

export type PlatformVoiceProfile = {
  channels: Record<string, PlatformVoiceChannel>;
  importMeta?: {
    source: "manual" | "url" | "oauth" | "csv";
    lastSyncedAt?: string;
    sampleCount?: number;
  };
};

export type PlatformVoices = Partial<Record<SocialPlatformId, PlatformVoiceProfile>>;

export type SocialPlatformScheduleConfig = {
  enabled: boolean;
  slotsPerWeek: number;
  preferredDays: number[];
  preferredTimes: string[];
  minHoursBetweenPosts: number;
  requireApproval: boolean;
};

export type SocialScheduleSettings = {
  timezone: string;
  platforms: Partial<Record<SocialPlatformId, SocialPlatformScheduleConfig>>;
  bestTimeMode: "manual" | "suggested" | "analytics";
};

export const DEFAULT_SOCIAL_PLATFORM_SCHEDULE: SocialPlatformScheduleConfig = {
  enabled: true,
  slotsPerWeek: 3,
  preferredDays: [1, 3, 5],
  preferredTimes: ["09:00"],
  minHoursBetweenPosts: 24,
  requireApproval: true,
};

export const DEFAULT_SOCIAL_SCHEDULE_SETTINGS: SocialScheduleSettings = {
  timezone: "UTC",
  platforms: {
    linkedin: { ...DEFAULT_SOCIAL_PLATFORM_SCHEDULE },
    twitter: { ...DEFAULT_SOCIAL_PLATFORM_SCHEDULE, slotsPerWeek: 5 },
    instagram: { ...DEFAULT_SOCIAL_PLATFORM_SCHEDULE, slotsPerWeek: 4 },
    facebook: { ...DEFAULT_SOCIAL_PLATFORM_SCHEDULE, slotsPerWeek: 3 },
    bluesky: { ...DEFAULT_SOCIAL_PLATFORM_SCHEDULE, slotsPerWeek: 5, requireApproval: false },
    mastodon: { ...DEFAULT_SOCIAL_PLATFORM_SCHEDULE, slotsPerWeek: 5, requireApproval: false },
  },
  bestTimeMode: "suggested",
};

export type ContentPieceApprovalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected";

export type EvergreenConfig = {
  enabled: boolean;
  recycleIntervalDays: number;
  maxRecycles?: number;
  recycleCount?: number;
};

export type SocialHistorySyncPlatformStatus = {
  connected?: boolean;
  lastSyncedAt?: string;
  postCount?: number;
  error?: string;
};

export type SocialHistorySyncMeta = Partial<
  Record<SocialPlatformId, SocialHistorySyncPlatformStatus>
>;
