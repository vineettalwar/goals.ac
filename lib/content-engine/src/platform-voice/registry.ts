import type { ContentFormatType } from "@workspace/db";
import {
  FORMAT_TO_SOCIAL_PLATFORM,
  SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORM_TO_FORMAT,
  type SocialPlatformId,
} from "@workspace/db/schema";

export type { SocialPlatformId };

export const PLATFORM_LABELS: Record<SocialPlatformId, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

/** Channel keys per platform for voice training */
export const PLATFORM_CHANNELS: Record<SocialPlatformId, string[]> = {
  linkedin: ["posts", "articles"],
  twitter: ["tweets", "threads"],
  instagram: ["captions"],
  facebook: ["posts"],
  bluesky: ["posts"],
  mastodon: ["toots"],
};

export const PLATFORM_CHAR_LIMITS: Record<SocialPlatformId, number> = {
  linkedin: 3000,
  twitter: 280,
  instagram: 2200,
  facebook: 63206,
  bluesky: 300,
  mastodon: 500,
};

export function isSocialFormat(format: ContentFormatType): boolean {
  return format in FORMAT_TO_SOCIAL_PLATFORM;
}

export function formatForPlatform(platform: SocialPlatformId): ContentFormatType {
  return SOCIAL_PLATFORM_TO_FORMAT[platform];
}

export function platformForFormat(format: ContentFormatType): SocialPlatformId | null {
  if (!(format in FORMAT_TO_SOCIAL_PLATFORM)) return null;
  return FORMAT_TO_SOCIAL_PLATFORM[format as keyof typeof FORMAT_TO_SOCIAL_PLATFORM];
}

export function isValidSocialPlatform(value: string): value is SocialPlatformId {
  return (SOCIAL_PLATFORM_IDS as readonly string[]).includes(value);
}

export function defaultChannelForPlatform(platform: SocialPlatformId): string {
  return PLATFORM_CHANNELS[platform][0] ?? "posts";
}

export function isValidChannel(platform: SocialPlatformId, channel: string): boolean {
  return PLATFORM_CHANNELS[platform].includes(channel);
}
