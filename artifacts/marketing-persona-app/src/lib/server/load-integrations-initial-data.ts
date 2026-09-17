import { cache } from "react";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getOrgAiSettingsForUser,
  hasOrgAnthropicCredentials,
  hasOrgBedrockCredentials,
  hasOrgOpenAICredentials,
  hasOrgOpenRouterCredentials,
  hasOrgGroqCredentials,
  hasOrgNvidiaCredentials,
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
import {
  getPlatformStockImageStatus,
  listByokStockProviders,
  STOCK_PROVIDER_REGISTRY,
} from "@workspace/stock-images";
import { decryptSecret } from "@workspace/security/encryption";
import type { SettingsAiSummary, SettingsIntegrationsSummary } from "@workspace/app-shell/settings";
import {
  buildAiProviderStatus,
  finalizeAiProviderStatus,
} from "@/lib/platform/ai-providers-status";
import { getOrgMembership, isSuperAdmin } from "@/lib/org/org-access";
import { isSiteAdmin } from "@/lib/org/org-access-shared";
import type { SettingsInitialData } from "@/lib/server/loaders";

export type IntegrationsInitialData = SettingsInitialData & {
  aiSummary: SettingsAiSummary;
  integrationsSummary: SettingsIntegrationsSummary;
};

function lastFour(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null;
  try {
    return decryptSecret(encrypted).slice(-4);
  } catch {
    return "••••";
  }
}

/** SSR seed for /integrations — no Ollama probe (that stays on the status API). */
export const loadIntegrationsInitialData = cache(
  async (userId: number): Promise<IntegrationsInitialData> => {
    const [user, orgSettings, membership] = await Promise.all([
      db
        .select({
          email: usersTable.email,
          googleId: usersTable.googleId,
          passwordHash: usersTable.passwordHash,
          role: usersTable.role,
          avatarUrl: usersTable.avatarUrl,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)
        .then((rows) => rows[0]),
      getOrgAiSettingsForUser(userId),
      getOrgMembership(userId),
    ]);

    const [deeplEncrypted, stockEncrypted] = await Promise.all([
      orgSettings ? getOrgEncryptedDeeplApiKey(orgSettings.organizationId) : Promise.resolve(null),
      orgSettings
        ? getOrgEncryptedStockCredentials(orgSettings.organizationId)
        : Promise.resolve(null),
    ]);

    const statusInput = orgSettings
      ? {
          aiProvider: orgSettings.aiProvider,
          ollamaBaseUrl: orgSettings.ollamaBaseUrl,
          ollamaModel: orgSettings.ollamaModel,
          openrouterModel: orgSettings.openrouterModel,
          nvidiaModel: orgSettings.nvidiaModel,
        }
      : undefined;

    const hasGeminiKey = Boolean(orgSettings?.encryptedGeminiKey);
    const hasOpenAIKey = hasOrgOpenAICredentials(orgSettings);
    const hasOpenRouterKey = hasOrgOpenRouterCredentials(orgSettings);
    const hasGroqKey = hasOrgGroqCredentials(orgSettings);
    const hasNvidiaKey = hasOrgNvidiaCredentials(orgSettings);
    const hasAnthropicKey = hasOrgAnthropicCredentials(orgSettings);
    const hasBedrock = hasOrgBedrockCredentials(orgSettings);

    // Skip enrichOllamaStatus — soft-nav must not wait on a probe timeout.
    const aiStatus = finalizeAiProviderStatus(buildAiProviderStatus(statusInput), {
      hasUserGeminiKey: hasGeminiKey,
      hasOrgBedrockKey: hasBedrock,
      hasOrgOpenAIKey: hasOpenAIKey,
      hasOrgOpenRouterKey: hasOpenRouterKey,
      hasOrgGroqKey: hasGroqKey,
      hasOrgNvidiaKey: hasNvidiaKey,
      hasOrgAnthropicKey: hasAnthropicKey,
      orgBedrockRegion: orgSettings?.bedrockRegion ?? null,
      orgBedrockModel: orgSettings?.bedrockModel ?? null,
    });

    const stockMasked = maskStockCredentialLastFour(stockEncrypted ?? undefined);

    const canManageAiSettings =
      isSiteAdmin(membership?.orgRole) || isSuperAdmin(user?.role);

    return {
      usage: null,
      me: user
        ? {
            email: user.email,
            role: user.role,
            orgRole: membership?.orgRole ?? null,
            avatarUrl: user.avatarUrl ?? null,
            hasGoogleId: Boolean(user.googleId),
            hasPassword: Boolean(user.passwordHash),
          }
        : null,
      canManageAiSettings,
      aiSummary: {
        activeProvider: aiStatus.activeProvider ?? "gemini",
        hasGeminiKey,
        geminiLastFour: lastFour(orgSettings?.encryptedGeminiKey),
        hasOpenaiKey: hasOpenAIKey,
        openaiLastFour: lastFour(orgSettings?.encryptedOpenaiApiKey),
        hasOpenrouterKey: hasOpenRouterKey,
        openrouterLastFour: lastFour(orgSettings?.encryptedOpenrouterApiKey),
        hasAnthropicKey,
        anthropicLastFour: lastFour(orgSettings?.encryptedAnthropicApiKey),
        hasGroqKey,
        groqLastFour: lastFour(orgSettings?.encryptedGroqApiKey),
        hasNvidiaKey,
        nvidiaLastFour: lastFour(orgSettings?.encryptedNvidiaApiKey),
        hasBedrockCredentials: hasBedrock,
        bedrockAccessKeyLastFour: lastFour(
          orgSettings?.encryptedBedrockSecretAccessKey ??
            orgSettings?.encryptedBedrockAccessKeyId,
        ),
        bedrockRegion: orgSettings?.bedrockRegion ?? null,
        bedrockModel: orgSettings?.bedrockModel ?? null,
        bedrockHasSessionToken: Boolean(orgSettings?.encryptedBedrockSessionToken),
        source: aiStatus.source,
        settings: {
          provider: aiStatus.settings?.provider ?? null,
          ollamaBaseUrl: aiStatus.settings?.ollamaBaseUrl ?? null,
          ollamaModel: aiStatus.settings?.ollamaModel ?? null,
          openrouterModel: aiStatus.settings?.openrouterModel ?? null,
          nvidiaModel: aiStatus.settings?.nvidiaModel ?? null,
        },
        ollama: aiStatus.ollama,
      },
      integrationsSummary: {
        semrush: {
          hasCredentials: hasOrgSemrushCredentials(orgSettings),
          apiKeyLastFour: lastFour(orgSettings?.encryptedSemrushApiKey),
          database: orgSettings?.semrushDatabase ?? "us",
        },
        deepl: {
          configured: Boolean(deeplEncrypted),
          apiKeyLastFour: maskEncryptedDeeplApiKeyLastFour(deeplEncrypted),
          docsUrl: "https://www.deepl.com/pro-api",
        },
        stock: {
          platform: getPlatformStockImageStatus(),
          org: Object.entries(stockMasked).map(([provider, apiKeyLastFour]) => ({
            provider,
            apiKeyLastFour: apiKeyLastFour ?? "••••",
            billing: STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY].billing,
            searchImplemented:
              STOCK_PROVIDER_REGISTRY[provider as keyof typeof STOCK_PROVIDER_REGISTRY]
                .searchImplemented,
          })),
          providers: listByokStockProviders(),
        },
      },
    };
  },
);
