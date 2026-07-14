import type {
  PlatformVoiceChannel,
  PlatformVoiceProfile,
  PlatformVoices,
  SocialPlatformId,
} from "@workspace/db/schema";
import {
  defaultChannelForPlatform,
  isValidChannel,
  PLATFORM_CHANNELS,
} from "./registry";
import { normalizeGenericSocialText, normalizeLinkedInText, normalizeTwitterText, splitPasteBlocks } from "./normalizers";

const MAX_SAMPLES_PER_CHANNEL = 10;

function emptyChannel(): PlatformVoiceChannel {
  return {
    writingExamples: [],
    typicalStructure: "",
    hookPatterns: [],
    doWords: [],
    dontWords: [],
    voiceTraits: [],
    platformTraits: {},
  };
}

function normalizeSample(platform: SocialPlatformId, text: string): string {
  if (platform === "linkedin") return normalizeLinkedInText(text);
  if (platform === "twitter") return normalizeTwitterText(text);
  return normalizeGenericSocialText(text);
}

export function getOrCreatePlatformVoice(
  voices: PlatformVoices | null | undefined,
  platform: SocialPlatformId,
): PlatformVoiceProfile {
  const existing = voices?.[platform];
  if (existing?.channels) return existing;

  const channels: Record<string, PlatformVoiceChannel> = {};
  for (const key of PLATFORM_CHANNELS[platform]) {
    channels[key] = emptyChannel();
  }
  return { channels, importMeta: existing?.importMeta };
}

export function mergeImportedSamples(params: {
  voices: PlatformVoices | null | undefined;
  platform: SocialPlatformId;
  channel: string;
  samples: string[];
  source: "manual" | "url" | "oauth" | "csv";
}): PlatformVoices {
  const { platform, channel, samples, source } = params;
  const resolvedChannel = isValidChannel(platform, channel)
    ? channel
    : defaultChannelForPlatform(platform);

  const profile = getOrCreatePlatformVoice(params.voices, platform);
  const current = profile.channels[resolvedChannel] ?? emptyChannel();
  const normalized = samples
    .map((s) => normalizeSample(platform, s))
    .filter((s) => s.length > 20);

  const merged = [...current.writingExamples, ...normalized]
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(-MAX_SAMPLES_PER_CHANNEL);

  const nextProfile: PlatformVoiceProfile = {
    ...profile,
    channels: {
      ...profile.channels,
      [resolvedChannel]: {
        ...current,
        writingExamples: merged,
      },
    },
    importMeta: {
      source,
      lastSyncedAt: new Date().toISOString(),
      sampleCount: merged.length,
    },
  };

  return {
    ...(params.voices ?? {}),
    [platform]: nextProfile,
  };
}

export function importFromPaste(params: {
  voices: PlatformVoices | null | undefined;
  platform: SocialPlatformId;
  channel: string;
  raw: string;
}): PlatformVoices {
  const samples = splitPasteBlocks(params.raw).map((s) =>
    normalizeSample(params.platform, s),
  );
  return mergeImportedSamples({
    voices: params.voices,
    platform: params.platform,
    channel: params.channel,
    samples,
    source: "manual",
  });
}

export function updatePlatformVoiceChannel(params: {
  voices: PlatformVoices | null | undefined;
  platform: SocialPlatformId;
  channel: string;
  updates: Partial<PlatformVoiceChannel>;
}): PlatformVoices {
  const profile = getOrCreatePlatformVoice(params.voices, params.platform);
  const resolvedChannel = isValidChannel(params.platform, params.channel)
    ? params.channel
    : defaultChannelForPlatform(params.platform);
  const current = profile.channels[resolvedChannel] ?? emptyChannel();

  return {
    ...(params.voices ?? {}),
    [params.platform]: {
      ...profile,
      channels: {
        ...profile.channels,
        [resolvedChannel]: {
          ...current,
          ...params.updates,
          writingExamples: params.updates.writingExamples ?? current.writingExamples,
        },
      },
    },
  };
}
