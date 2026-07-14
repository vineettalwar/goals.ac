import crypto from "crypto";
import type { DomainKeywordGap } from "@workspace/keyword-research-provider";
import { extractDomain } from "@workspace/keyword-research-provider";
import { getCache } from "../core/cache";

/** Reuse cached Semrush gap rows within this window to avoid repeat API unit spend. */
export const SEMRUSH_GAP_CACHE_TTL_MS = 24 * 60 * 60_000;

export function buildSemrushGapCacheKey(params: {
  projectId: number;
  domain: string;
  competitors: string[];
  database: string;
}): string {
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        domain: extractDomain(params.domain),
        competitors: [...params.competitors].map(extractDomain).filter(Boolean).sort(),
        database: params.database.toLowerCase(),
      }),
    )
    .digest("hex")
    .slice(0, 16);

  return `semrush:gaps:v1:${params.projectId}:${fingerprint}`;
}

export async function getCachedSemrushGaps(cacheKey: string): Promise<DomainKeywordGap[] | null> {
  const cache = await getCache();
  const raw = await cache.get(cacheKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DomainKeywordGap[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setCachedSemrushGaps(
  cacheKey: string,
  gaps: DomainKeywordGap[],
): Promise<void> {
  const cache = await getCache();
  await cache.set(cacheKey, JSON.stringify(gaps), SEMRUSH_GAP_CACHE_TTL_MS);
}
