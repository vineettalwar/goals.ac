import { getAiProviderClient, type AiProviderClient, type AiProviderOptions } from "@workspace/ai-providers";
import type { PlatformVoiceChannel, PlatformVoices, SocialPlatformId } from "@workspace/db/schema";
import { cleanAndParse } from "../core/utils";
import { resolveAiClient } from "../support/ai/resolve-ai-client";
import { PLATFORM_CHANNELS, PLATFORM_LABELS } from "./registry";
import { ensurePlatformVoice } from "./platform-voice-import-service";

const ANALYZE_SYSTEM = `You are an expert social media voice analyst. Extract writing style traits from sample posts.
Respond ONLY with valid JSON. No markdown fences.`;

type AnalyzeResult = {
  typicalStructure: string;
  hookPatterns: string[];
  doWords: string[];
  dontWords: string[];
  voiceTraits: string[];
  platformTraits: Record<string, unknown>;
};

async function resolveClient(
  userApiKey?: string | null,
  aiProviderOptions?: AiProviderOptions,
): Promise<AiProviderClient> {
  if (userApiKey !== undefined || aiProviderOptions) {
    return resolveAiClient(userApiKey, aiProviderOptions);
  }
  return getAiProviderClient();
}

function buildAnalyzePrompt(
  platform: SocialPlatformId,
  channel: string,
  samples: string[],
): string {
  const label = PLATFORM_LABELS[platform];
  const joined = samples
    .slice(0, 8)
    .map((s, i) => `Sample ${i + 1}:\n${s.slice(0, 2000)}`)
    .join("\n\n");

  return `Analyze these ${label} ${channel} samples and extract the author's distinctive voice.

${joined}

Return JSON with:
- typicalStructure: string (e.g. "Hook → Story → Insight → CTA")
- hookPatterns: string[] (3-6 patterns like "bold question", "contrarian opener")
- doWords: string[] (8-15 preferred words/phrases)
- dontWords: string[] (5-10 words/phrases to avoid)
- voiceTraits: string[] (5-8 traits like "punchy", "story-driven")
- platformTraits: object with platform-specific keys (emojiStyle, hashtagStyle, lineBreakStyle, threadOpenerStyle, etc.)`;
}

export async function analyzePlatformVoiceChannel(params: {
  voices: PlatformVoices | null | undefined;
  platform: SocialPlatformId;
  channel: string;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}): Promise<{ voices: PlatformVoices; channel: PlatformVoiceChannel }> {
  const profile = ensurePlatformVoice(params.voices, params.platform);
  const current = profile.channels[params.channel];
  if (!current || current.writingExamples.length === 0) {
    throw new Error("Add writing samples before analyzing");
  }

  const ai = await resolveClient(params.userApiKey, params.aiProviderOptions);
  const response = await ai.generate({
    prompt: buildAnalyzePrompt(params.platform, params.channel, current.writingExamples),
    systemInstruction: ANALYZE_SYSTEM,
    responseMimeType: "application/json",
    maxOutputTokens: 2048,
    thinkingBudget: 0,
  });

  const parsed = cleanAndParse<AnalyzeResult>(response.text ?? "{}");
  const updatedChannel: PlatformVoiceChannel = {
    ...current,
    typicalStructure: parsed.typicalStructure?.trim() || current.typicalStructure,
    hookPatterns: parsed.hookPatterns?.slice(0, 8) ?? current.hookPatterns,
    doWords: parsed.doWords?.slice(0, 16) ?? current.doWords,
    dontWords: parsed.dontWords?.slice(0, 12) ?? current.dontWords,
    voiceTraits: parsed.voiceTraits?.slice(0, 10) ?? current.voiceTraits,
    platformTraits: { ...current.platformTraits, ...(parsed.platformTraits ?? {}) },
    lastAnalyzedAt: new Date().toISOString(),
  };

  const voices: PlatformVoices = {
    ...(params.voices ?? {}),
    [params.platform]: {
      ...profile,
      channels: {
        ...profile.channels,
        [params.channel]: updatedChannel,
      },
    },
  };

  return { voices, channel: updatedChannel };
}

export async function analyzeAllPlatformChannels(params: {
  voices: PlatformVoices | null | undefined;
  platform: SocialPlatformId;
  userApiKey?: string | null;
  aiProviderOptions?: AiProviderOptions;
}): Promise<PlatformVoices> {
  let next = params.voices ?? {};
  for (const channel of PLATFORM_CHANNELS[params.platform]) {
    const profile = ensurePlatformVoice(next, params.platform);
    const samples = profile.channels[channel]?.writingExamples ?? [];
    if (samples.length === 0) continue;
    const result = await analyzePlatformVoiceChannel({
      voices: next,
      platform: params.platform,
      channel,
      userApiKey: params.userApiKey,
      aiProviderOptions: params.aiProviderOptions,
    });
    next = result.voices;
  }
  return next;
}
