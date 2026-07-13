import { createClient } from "redis";
import type { StockPhoto } from "./types";

export interface StockCacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
}

class InMemoryStockCache implements StockCacheAdapter {
  private readonly map = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

let _cache: StockCacheAdapter | null = null;

export async function getStockCache(): Promise<StockCacheAdapter> {
  if (_cache) return _cache;
  const redisUrl = process.env["REDIS_URL"];
  if (redisUrl) {
    try {
      const client = createClient({ url: redisUrl });
      client.on("error", () => {});
      await client.connect();
      _cache = {
        get: (key) => client.get(key).catch(() => null),
        set: (key, value, ttlMs) =>
          client.set(key, value, { PX: ttlMs }).then(() => undefined).catch(() => undefined),
      };
      return _cache;
    } catch {
      // fall through
    }
  }
  _cache = new InMemoryStockCache();
  return _cache;
}

export const STOCK_SEARCH_CACHE_TTL_MS = 24 * 60 * 60_000;

export async function getCachedSearch(key: string): Promise<StockPhoto[] | null> {
  const cache = await getStockCache();
  const raw = await cache.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StockPhoto[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setCachedSearch(key: string, photos: StockPhoto[]): Promise<void> {
  const cache = await getStockCache();
  await cache.set(key, JSON.stringify(photos), STOCK_SEARCH_CACHE_TTL_MS);
}

export function buildSearchCacheKey(
  provider: string,
  query: string,
  orientation: string,
): string {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  return `stock:search:v1:${provider}:${orientation}:${normalized}`;
}
