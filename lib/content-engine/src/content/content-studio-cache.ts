import { createHash } from "node:crypto";
import { logger } from "../core/logger";
import { getCache } from "../core/cache";
import { brandVoiceCacheFingerprint } from "../brand/brand-voice";
import { normalizeCompetitorUrlList } from "../support/competitor/competitor-url";
import type { BrandContext, ContentPieceResult } from "./content-studio-prompts";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function buildCacheKey(
  format: string,
  keyword: string,
  brand: BrandContext,
  angleHint?: string,
  intendedPlatform?: string,
  competitorFocusUrl?: string,
  competitorUrls?: string[],
): string {
  const urlsKey = normalizeCompetitorUrlList(competitorUrls ?? []).join(",");
  const raw = [
    format,
    keyword.toLowerCase().trim(),
    brand.companyName,
    brand.websiteUrl,
    brand.industry,
    brand.voiceTone,
    brand.targetAudience,
    (brand.primaryKeywords ?? []).slice().sort().join(","),
    angleHint?.trim() ?? "",
    intendedPlatform?.trim() ?? "",
    competitorFocusUrl?.trim() ?? "",
    urlsKey,
    brandVoiceCacheFingerprint(brand),
    "seo-v8",
  ].join("::");
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export async function cacheGet(
  key: string,
): Promise<ContentPieceResult | null> {
  try {
    const cache = await getCache();
    const raw = await cache.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as ContentPieceResult;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  result: ContentPieceResult,
): Promise<void> {
  try {
    const cache = await getCache();
    await cache.set(key, JSON.stringify(result), CACHE_TTL_MS);
  } catch (err) {
    logger.warn({ err }, "Failed to write content piece to cache");
  }
}
