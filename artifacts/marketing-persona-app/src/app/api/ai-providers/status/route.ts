import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getOrgAiSettingsForUser, hasOrgBedrockCredentials, hasOrgAnthropicCredentials, hasOrgOpenAICredentials } from "@workspace/content-engine/support/ai/org-ai-settings";
import { buildAiProviderStatus, enrichOllamaStatus, finalizeAiProviderStatus, toAiProviderOptions } from "@/lib/platform/ai-providers-status";

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
      hasOrgAnthropicKey: hasOrgAnthropicCredentials(orgSettings),
      hasOrgOpenAIKey: hasOrgOpenAICredentials(orgSettings),
      orgBedrockRegion: orgSettings?.bedrockRegion ?? null,
      orgBedrockModel: orgSettings?.bedrockModel ?? null,
    }),
  );
}
