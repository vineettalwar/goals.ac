import {
  buildSearchCacheKey,
  getCachedSearch,
  setCachedSearch,
} from "./cache";
import { searchPexels } from "./pexels";
import { pickBestFromRanked, rankStockPhotos } from "./rank";
import type {
  RankedStockPhoto,
  StockPhoto,
  StockProvider,
  StockSearchOptions,
} from "./types";
import { searchUnsplash, trackUnsplashDownload } from "./unsplash";

async function searchProvider(
  provider: StockProvider,
  query: string,
  options: StockSearchOptions,
): Promise<StockPhoto[]> {
  const orientation = options.orientation ?? "landscape";
  const cacheKey = buildSearchCacheKey(provider, query, orientation);
  const cached = await getCachedSearch(cacheKey);
  if (cached) return cached;

  const perPage = options.perPage ?? 15;
  const photos =
    provider === "unsplash"
      ? await searchUnsplash(query, { orientation, perPage })
      : await searchPexels(query, { orientation, perPage });

  await setCachedSearch(cacheKey, photos);
  return photos;
}

async function searchWithProvider(
  provider: StockProvider | "auto",
  query: string,
  options: StockSearchOptions,
): Promise<StockPhoto[]> {
  if (provider === "auto") {
    const results: StockPhoto[] = [];
    const hasUnsplash = Boolean(process.env["UNSPLASH_ACCESS_KEY"]);
    const hasPexels = Boolean(process.env["PEXELS_API_KEY"]);

    if (hasUnsplash) {
      try {
        results.push(...(await searchProvider("unsplash", query, options)));
      } catch {
        // try other provider
      }
    }
    if (hasPexels) {
      try {
        results.push(...(await searchProvider("pexels", query, options)));
      } catch {
        // ignore
      }
    }
    if (!hasUnsplash && !hasPexels) {
      throw new Error("No stock image API keys configured (UNSPLASH_ACCESS_KEY or PEXELS_API_KEY)");
    }
    return results;
  }

  return searchProvider(provider, query, options);
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

  for (const query of queries) {
    const photos = await searchStockPhotos(query, options);
    const ranked = rankStockPhotos(keyword, photos, {
      orientation: options.orientation,
      excludeIds,
    });
    const best = pickBestFromRanked(ranked);
    if (best) {
      if (best.provider === "unsplash") {
        await trackUnsplashDownload(best.id);
      }
      return best;
    }
  }

  return null;
}

export { rankStockPhotos, pickBestFromRanked } from "./rank";
export type * from "./types";
export { assertAllowedStockCdnUrl, isAllowedStockCdnHost } from "./allowed-hosts";
