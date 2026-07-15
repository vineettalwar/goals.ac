import { withCors } from "@workspace/cf-edge/cors";
import { decryptSecret } from "@workspace/security/encryption";
import {
  getOrgAiSettingsForUser,
  hasOrgBedrockCredentials,
} from "@workspace/content-engine/support/ai/org-ai-settings";

type OrgKeyRoute = {
  path: string;
  getEncrypted: (settings: Awaited<ReturnType<typeof getOrgAiSettingsForUser>>) => string | null | undefined;
};

const ORG_KEY_ROUTES: OrgKeyRoute[] = [
  {
    path: "/api/auth/api-key",
    getEncrypted: (settings) => settings?.encryptedGeminiKey,
  },
  {
    path: "/api/auth/openai-credentials",
    getEncrypted: (settings) => settings?.encryptedOpenaiApiKey,
  },
  {
    path: "/api/auth/anthropic-credentials",
    getEncrypted: (settings) => settings?.encryptedAnthropicApiKey,
  },
];

export async function handleAuthRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  if (request.method !== "GET") {
    return null;
  }

  if (path === "/api/auth/bedrock-credentials") {
    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!hasOrgBedrockCredentials(orgSettings)) {
      return withCors(request, Response.json({ hasCredentials: false }));
    }

    let accessKeyLastFour = "••••";
    try {
      if (orgSettings?.encryptedBedrockAccessKeyId) {
        accessKeyLastFour = decryptSecret(orgSettings.encryptedBedrockAccessKeyId).slice(-4);
      }
    } catch {
      // keep placeholder if decryption fails
    }

    return withCors(
      request,
      Response.json({
        hasCredentials: true,
        accessKeyLastFour,
        region: orgSettings?.bedrockRegion ?? null,
        model: orgSettings?.bedrockModel ?? null,
        hasSessionToken: Boolean(orgSettings?.encryptedBedrockSessionToken),
      }),
    );
  }

  const route = ORG_KEY_ROUTES.find((entry) => entry.path === path);
  if (!route) {
    return null;
  }

  const orgSettings = await getOrgAiSettingsForUser(userId);
  const encrypted = route.getEncrypted(orgSettings);
  if (!encrypted) {
    return withCors(request, Response.json({ hasKey: false }));
  }

  let lastFour = "••••";
  try {
    lastFour = decryptSecret(encrypted).slice(-4);
  } catch {
    // keep placeholder if decryption fails
  }

  return withCors(request, Response.json({ hasKey: true, lastFour }));
}
