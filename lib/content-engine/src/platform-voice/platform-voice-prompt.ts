import type { PlatformVoiceChannel, PlatformVoices, SocialPlatformId } from "@workspace/db/schema";
import { defaultChannelForPlatform, PLATFORM_LABELS } from "./registry";

function listSection(label: string, items: string[] | undefined, max = 10): string {
  const values = (items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, max);
  if (values.length === 0) return "";
  return `${label}:\n${values.map((item) => `- ${item}`).join("\n")}`;
}

function channelToPrompt(channel: PlatformVoiceChannel, platformLabel: string): string {
  const sections: string[] = [];
  sections.push(`PLATFORM: ${platformLabel}`);

  if (channel.voiceTraits.length > 0) {
    sections.push(listSection("VOICE TRAITS", channel.voiceTraits, 8));
  }
  if (channel.hookPatterns.length > 0) {
    sections.push(listSection("HOOK PATTERNS (prefer these openers)", channel.hookPatterns, 6));
  }
  if (channel.typicalStructure.trim()) {
    sections.push(`TYPICAL STRUCTURE:\n${channel.typicalStructure.trim()}`);
  }
  if (channel.doWords.length > 0) {
    sections.push(listSection("PREFERRED WORDS & PHRASES", channel.doWords, 14));
  }
  if (channel.dontWords.length > 0) {
    sections.push(`DO NOT USE: ${channel.dontWords.slice(0, 12).join(", ")}`);
  }

  const examples = channel.writingExamples.map((s) => s.trim()).filter(Boolean);
  if (examples.length > 0) {
    sections.push(
      `WRITING EXAMPLES (match cadence — do NOT copy):\n${examples
        .slice(0, 3)
        .map((sample, index) => `Example ${index + 1}:\n${sample.slice(0, 1200)}`)
        .join("\n\n")}`,
    );
  }

  const traits = channel.platformTraits ?? {};
  const traitLines = Object.entries(traits)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `- ${k}: ${String(v)}`);
  if (traitLines.length > 0) {
    sections.push(`PLATFORM STYLE:\n${traitLines.join("\n")}`);
  }

  return sections.join("\n\n");
}

export function getPlatformVoiceChannel(
  voices: PlatformVoices | null | undefined,
  platform: SocialPlatformId,
  channel?: string,
): PlatformVoiceChannel | null {
  const profile = voices?.[platform];
  if (!profile?.channels) return null;
  const key = channel && profile.channels[channel] ? channel : defaultChannelForPlatform(platform);
  return profile.channels[key] ?? null;
}

export function buildPlatformVoicePromptContext(
  voices: PlatformVoices | null | undefined,
  platform: SocialPlatformId,
  channel?: string,
): string {
  const resolved = getPlatformVoiceChannel(voices, platform, channel);
  if (!resolved) return "";
  const hasContent =
    resolved.writingExamples.length > 0 ||
    resolved.voiceTraits.length > 0 ||
    resolved.typicalStructure.trim().length > 0;
  if (!hasContent) return "";

  const body = channelToPrompt(resolved, PLATFORM_LABELS[platform]);
  return `\n${body}\n`;
}

export function hasPlatformVoice(
  voices: PlatformVoices | null | undefined,
  platform: SocialPlatformId,
): boolean {
  return buildPlatformVoicePromptContext(voices, platform).length > 0;
}
