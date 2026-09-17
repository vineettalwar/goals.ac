export type VoiceGateStatus = {
  voiceReady: boolean;
  voiceBuilding: boolean;
  hasBrandVoice: boolean;
  hasPlatformVoice: boolean;
  scrapeStatus: string | null;
};

export function parseVoiceGateFromBrandProfile(data: Record<string, unknown> | null): VoiceGateStatus {
  return {
    voiceReady: Boolean(data?.voiceReady),
    voiceBuilding: Boolean(data?.voiceBuilding),
    hasBrandVoice: Boolean(data?.hasBrandVoice),
    hasPlatformVoice: Boolean(data?.hasPlatformVoice),
    scrapeStatus: typeof data?.scrapeStatus === "string" ? data.scrapeStatus : null,
  };
}
