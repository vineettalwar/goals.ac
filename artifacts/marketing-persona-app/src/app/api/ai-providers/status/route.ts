import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getOrgAiSettingsForUser, hasOrgBedrockCredentials } from "@workspace/content-engine/support/org-ai-settings";
import { buildAiProviderStatus, enrichOllamaStatus, finalizeAiProviderStatus, toAiProviderOptions } from "@/lib/ai-providers-status";

function toStatusInput(
  settings: Awaited<ReturnType<typeof getOrgAiSettingsForUser>>,
) {
  return settings
    ? {
        aiProvider: settings.aiProvider,
        ollamaBaseUrl: settings.ollamaBaseUrl,
        ollamaModel: settings.ollamaModel,
      }
    : undefined;
}

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const orgSettings = await getOrgAiSettingsForUser(userId!);
  const statusInput = toStatusInput(orgSettings);
  const payload = buildAiProviderStatus(statusInput);
  await enrichOllamaStatus(payload, toAiProviderOptions(statusInput));

  return NextResponse.json(
    finalizeAiProviderStatus(payload, {
      hasUserGeminiKey: Boolean(orgSettings?.encryptedGeminiKey),
      hasOrgBedrockKey: hasOrgBedrockCredentials(orgSettings),
      orgBedrockRegion: orgSettings?.bedrockRegion ?? null,
      orgBedrockModel: orgSettings?.bedrockModel ?? null,
    }),
  );
}
