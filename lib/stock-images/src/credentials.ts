import type { StockProviderId } from "./providers";
import { SEARCHABLE_STOCK_PROVIDERS, STOCK_PROVIDER_REGISTRY } from "./providers";
import type { StockProvider } from "./types";

export type EncryptedStockCredentialsMap = Partial<Record<StockProviderId, string>>;

/** Decrypted API keys available for resolution (project overrides org overrides platform). */
export type DecryptedStockCredentialContext = {
  org?: Partial<Record<StockProviderId, string>>;
  project?: Partial<Record<StockProviderId, string>>;
  platform?: Partial<Record<StockProviderId, string>>;
};

function envKey(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function platformEnvKey(provider: StockProviderId): string | undefined {
  if (provider === "unsplash") return envKey("UNSPLASH_ACCESS_KEY");
  if (provider === "pexels") return envKey("PEXELS_API_KEY");
  return undefined;
}

export function resolveStockApiKey(
  provider: StockProviderId,
  ctx?: DecryptedStockCredentialContext,
): string | undefined {
  const projectKey = ctx?.project?.[provider]?.trim();
  if (projectKey) return projectKey;

  const orgKey = ctx?.org?.[provider]?.trim();
  if (orgKey) return orgKey;

  if (STOCK_PROVIDER_REGISTRY[provider].billing === "free") {
    const envValue = platformEnvKey(provider);
    if (envValue) return envValue;
    const platformKey = ctx?.platform?.[provider]?.trim();
    if (platformKey) return platformKey;
  }

  return undefined;
}

export function isProviderSearchConfigured(
  provider: StockProviderId,
  ctx?: DecryptedStockCredentialContext,
): boolean {
  if (!STOCK_PROVIDER_REGISTRY[provider].searchImplemented) return false;
  return Boolean(resolveStockApiKey(provider, ctx));
}

/** True when at least one searchable stock provider can run (platform, org, or project keys). */
export function isStockSearchAvailable(ctx?: DecryptedStockCredentialContext): boolean {
  for (const provider of SEARCHABLE_STOCK_PROVIDERS) {
    if (isProviderSearchConfigured(provider, ctx)) return true;
  }
  return false;
}

export function listConfiguredSearchProviders(
  ctx?: DecryptedStockCredentialContext,
): StockProvider[] {
  return SEARCHABLE_STOCK_PROVIDERS.filter((provider) =>
    isProviderSearchConfigured(provider, ctx),
  ) as StockProvider[];
}
