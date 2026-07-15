import { withCors } from "@workspace/cf-edge/cors";
import { decryptSecret } from "@workspace/security/encryption";
import {
  getOrgAiSettingsForUser,
  hasOrgBedrockCredentials,
  hasOrgSemrushCredentials,
} from "@workspace/content-engine/support/ai/org-ai-settings";
import {
  getOrgEncryptedDeeplApiKey,
  maskEncryptedDeeplApiKeyLastFour,
} from "@workspace/content-engine/support/integrations/deepl-credentials";
import {
  getOrgEncryptedStockCredentials,
  maskStockCredentialLastFour,
} from "@workspace/content-engine/support/integrations/stock-credentials";
import { SEMRUSH_DATABASES } from "@workspace/keyword-research-provider";
import {
  getPlatformStockImageStatus,
  listByokStockProviders,
  STOCK_PROVIDER_REGISTRY,
} from "@workspace/stock-images";

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

  if (path === "/api/auth/semrush-credentials") {
    const orgSettings = await getOrgAiSettingsForUser(userId);
    if (!hasOrgSemrushCredentials(orgSettings)) {
      return withCors(
        request,
        Response.json({
          hasCredentials: false,
          database: orgSettings?.semrushDatabase ?? "us",
        }),
      );
    }

    let apiKeyLastFour = "••••";
    try {
      if (orgSettings?.encryptedSemrushApiKey) {
        apiKeyLastFour = decryptSecret(orgSettings.encryptedSemrushApiKey).slice(-4);
      }
    } catch {
      // keep placeholder
    }

    return withCors(
      request,
      Response.json({
        hasCredentials: true,
        apiKeyLastFour,
        database: orgSettings?.semrushDatabase ?? "us",
        supportedDatabases: SEMRUSH_DATABASES,
      }),
    );
  }

  if (path === "/api/auth/deepl-credentials") {
    const orgSettings = await getOrgAiSettingsForUser(userId);
    const encrypted = orgSettings
      ? await getOrgEncryptedDeeplApiKey(orgSettings.organizationId)
      : null;

    return withCors(
      request,
      Response.json({
        configured: Boolean(encrypted),
        apiKeyLastFour: maskEncryptedDeeplApiKeyLastFour(encrypted),
        docsUrl: "https://www.deepl.com/pro-api",
      }),
    );
  }

  if (path === "/api/auth/stock-credentials") {
    const orgSettings = await getOrgAiSettingsForUser(userId);
    const encrypted = orgSettings
      ? await getOrgEncryptedStockCredentials(orgSettings.organizationId)
      : null;
    const masked = maskStockCredentialLastFour(encrypted ?? undefined);

    return withCors(
      request,
      Response.json({
        platform: getPlatformStockImageStatus(),
        org: Object.entries(masked).map(([provider, apiKeyLastFour]) => ({
          provider,
          apiKeyLastFour,
          billing: STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].billing,
          searchImplemented:
            STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].searchImplemented,
        })),
        providers: listByokStockProviders(),
      }),
    );
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
