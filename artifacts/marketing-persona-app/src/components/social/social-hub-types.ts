export const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "X / Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "bluesky", label: "Bluesky" },
  { id: "mastodon", label: "Mastodon" },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

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

export const WEEK_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
