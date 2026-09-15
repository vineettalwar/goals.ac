import type { PlatformVoices } from "@workspace/db";
import { SOCIAL_PLATFORM_IDS } from "@workspace/db/schema";
import { hasPlatformVoice } from "../platform-voice/platform-voice-prompt";

/** User opted out of waiting for the brand scrape. */
export const BRAND_SCRAPE_SKIPPED = "skipped";

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

export function scrapeStatusIsSettled(status: string | null | undefined): boolean {
  return status === "done" || status === "failed" || status === BRAND_SCRAPE_SKIPPED;
}

/**
 * Voice is ready when brand fields or any platform voice exist, or the user
 * skipped reading brand voice. While scrape is still pending and nothing is
 * ready yet, treat as "building".
 */
export function evaluateProjectVoiceReady(input: ProjectVoiceReadyInput): ProjectVoiceReadyResult {
  const scrapeStatus = input.scrapeStatus ?? null;
  const brandReady = hasBrandVoiceFields(input);
  const platformReady = hasAnyPlatformVoice(input.platformVoices);
  const skipped = scrapeStatus === BRAND_SCRAPE_SKIPPED;
  const ready = brandReady || platformReady || skipped;
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
