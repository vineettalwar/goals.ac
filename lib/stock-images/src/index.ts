import {
  buildSearchCacheKey,
  getCachedSearch,
  setCachedSearch,
} from "./cache";
import {
  isProviderSearchConfigured,
  listConfiguredSearchProviders,
  resolveStockApiKey,
  type DecryptedStockCredentialContext,
} from "./credentials";
import { searchPexels } from "./pexels";
import { STOCK_PROVIDER_REGISTRY, type FreeStockProvider } from "./providers";
import { pickBestFromRanked, rankStockPhotos } from "./rank";
import type {
  RankedStockPhoto,
  StockPhoto,
  StockProvider,
  StockSearchOptions,
} from "./types";
import { searchUnsplash, trackUnsplashDownload } from "./unsplash";

async function runStockSearch(
  provider: FreeStockProvider,
  query: string,
  options: StockSearchOptions,
  credentials?: DecryptedStockCredentialContext,
): Promise<StockPhoto[]> {
  const orientation = options.orientation ?? "landscape";
  const cacheKey = buildSearchCacheKey(provider, query, orientation);
  const cached = await getCachedSearch(cacheKey);
  if (cached) return cached;

  const perPage = options.perPage ?? 15;
  const accessKey = resolveStockApiKey(provider, credentials);
  if (!accessKey) {
    throw new Error(`${provider} API key is not configured`);
  }

  let photos: StockPhoto[];
  switch (provider) {
    case "unsplash":
      photos = await searchUnsplash(query, { orientation, perPage, accessKey });
      break;
    case "pexels":
      photos = await searchPexels(query, { orientation, perPage, apiKey: accessKey });
      break;
    default: {
      const unknownProvider: never = provider;
      throw new Error(`Unsupported stock provider: ${unknownProvider}`);
    }
  }

  await setCachedSearch(cacheKey, photos);
  return photos;
}

function normalizeSearchProvider(provider: StockProvider | "auto"): StockProvider | "auto" {
  if (provider === "auto") return "auto";
  if (!STOCK_PROVIDER_REGISTRY[provider].searchImplemented) return "auto";
  return provider;
}

async function searchWithProvider(
  provider: StockProvider | "auto",
  query: string,
  options: StockSearchOptions,
): Promise<StockPhoto[]> {
  const credentials = options.credentials;
  const resolvedProvider = normalizeSearchProvider(provider);

  if (resolvedProvider === "auto") {
    const results: StockPhoto[] = [];
    const configured = listConfiguredSearchProviders(credentials);
    if (configured.length === 0) {
      throw new Error(
        "No stock image API keys configured (platform UNSPLASH_ACCESS_KEY / PEXELS_API_KEY or org/project BYOK)",
      );
    }

    for (const providerId of configured) {
      try {
        results.push(...(await runStockSearch(providerId, query, options, credentials)));
      } catch {
        // try other provider
      }
    }

    if (results.length === 0) {
      throw new Error("Stock image search failed for all configured providers");
    }
    return results;
  }

  if (!isProviderSearchConfigured(resolvedProvider, credentials)) {
    throw new Error(`${resolvedProvider} API key is not configured`);
  }

  return runStockSearch(resolvedProvider, query, options, credentials);
}

export async function searchStockPhotos(
  query: string,
  options: StockSearchOptions = {},
): Promise<StockPhoto[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return searchWithProvider(options.provider ?? "auto", trimmed, options);
}

export async function pickBestStockPhoto(
  keyword: string,
  options: StockSearchOptions & { fallbackQueries?: string[] } = {},
): Promise<RankedStockPhoto | null> {
  const queries = [keyword.trim(), ...(options.fallbackQueries ?? [])].filter(Boolean);
  const excludeIds = options.excludeIds ?? [];
  const credentials = options.credentials;

  for (const query of queries) {
    const photos = await searchStockPhotos(query, options);
    const ranked = rankStockPhotos(keyword, photos, {
      orientation: options.orientation,
      excludeIds,
    });
    const best = pickBestFromRanked(ranked);
    if (best) {
      if (best.provider === "unsplash") {
        const accessKey = resolveStockApiKey("unsplash", credentials);
        await trackUnsplashDownload(best.id, accessKey);
      }
      return best;
    }
  }

  return null;
}

export { rankStockPhotos, pickBestFromRanked } from "./rank";
export type * from "./types";
export { assertAllowedStockCdnUrl, isAllowedStockCdnHost } from "./allowed-hosts";
export {
  getPlatformStockImageStatus,
  isPlatformStockConfigured,
  type PlatformStockImageStatus,
} from "./platform-status";
export {
  isStockSearchAvailable,
  isProviderSearchConfigured,
  listConfiguredSearchProviders,
  resolveStockApiKey,
  type DecryptedStockCredentialContext,
  type EncryptedStockCredentialsMap,
} from "./credentials";
export {
  FREE_STOCK_PROVIDERS,
  PAID_STOCK_PROVIDERS,
  SEARCHABLE_STOCK_PROVIDERS,
  STOCK_PROVIDER_IDS,
  STOCK_PROVIDER_REGISTRY,
  isPaidStockProvider,
  isStockProviderId,
  listByokStockProviders,
  listPaidByokProviders,
  type PaidStockProvider,
  type StockProviderId,
} from "./providers";
export { testStockProviderConnection } from "./test-connection";
export {
  getDecryptedPlatformStockCredentials,
  invalidatePlatformStockCredentialsCache,
  isPexelsManagedByEnv,
  isUnsplashManagedByEnv,
  resolvePlatformStockApiKey,
} from "./platform-credentials";
