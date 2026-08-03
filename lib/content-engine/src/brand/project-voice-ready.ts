import type { PlatformVoices } from "@workspace/db";
import { SOCIAL_PLATFORM_IDS } from "@workspace/db/schema";
import { hasPlatformVoice } from "../platform-voice/platform-voice-prompt";

export type ProjectVoiceReadyInput = {
  scrapeStatus?: string | null;
  voiceTone?: string | null;
  writingExamples?: string[] | null;
  brandVoiceSkill?: string | null;
  platformVoices?: PlatformVoices | null;
};

export type ProjectVoiceReadyResult = {
  ready: boolean;
  building: boolean;
  hasBrandVoice: boolean;
  hasPlatformVoice: boolean;
  scrapeStatus: string | null;
};

export function hasBrandVoiceFields(
  input: Pick<ProjectVoiceReadyInput, "voiceTone" | "writingExamples" | "brandVoiceSkill">,
): boolean {
  if (input.voiceTone?.trim()) return true;
  if (input.brandVoiceSkill?.trim()) return true;
  const examples = input.writingExamples ?? [];
  return examples.some((sample) => sample.trim().length > 0);
}

export function hasAnyPlatformVoice(voices: PlatformVoices | null | undefined): boolean {
  if (!voices) return false;
  return SOCIAL_PLATFORM_IDS.some((platform) => hasPlatformVoice(voices, platform));
}

/**
 * Voice is ready when brand fields or any platform voice exist.
 * While scrape is still pending and nothing is ready yet, treat as "building".
 */
export function evaluateProjectVoiceReady(input: ProjectVoiceReadyInput): ProjectVoiceReadyResult {
  const scrapeStatus = input.scrapeStatus ?? null;
  const brandReady = hasBrandVoiceFields(input);
  const platformReady = hasAnyPlatformVoice(input.platformVoices);
  const ready = brandReady || platformReady;
  const building = !ready && scrapeStatus === "pending";

  return {
    ready,
    building,
    hasBrandVoice: brandReady,
    hasPlatformVoice: platformReady,
    scrapeStatus,
  };
}

export function isProjectVoiceReady(input: ProjectVoiceReadyInput): boolean {
  return evaluateProjectVoiceReady(input).ready;
}
