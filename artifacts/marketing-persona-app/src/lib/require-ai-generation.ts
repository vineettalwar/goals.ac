import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/platform-settings";

/** API guard — returns 503 when AI services are paused platform-wide. */
export async function requireAiGenerationEnabled() {
  const settings = await getPlatformSettings();
  if (!settings.aiGenerationEnabled) {
    return {
      error: NextResponse.json(
        { error: "AI services are temporarily unavailable. Please try again later." },
        { status: 503 },
      ),
    };
  }
  return { error: null };
}
