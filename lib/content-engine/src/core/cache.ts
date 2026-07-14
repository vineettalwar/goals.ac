import { createClient } from "redis";
import { getAiCacheKv } from "./kv-binding";
import { logger } from "./logger";

export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
}

class InMemoryLruCache implements CacheAdapter {
  private readonly map = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly maxSize: number) {}

  async get(key: string): Promise<string | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.map.delete(key); return null; }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    if (this.map.size >= this.maxSize) {
      const lruKey = this.map.keys().next().value;
      if (lruKey) this.map.delete(lruKey);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

class KvCache implements CacheAdapter {
  constructor(private readonly kv: NonNullable<ReturnType<typeof getAiCacheKv>>) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.kv.get(key, "text");
    } catch (err) {
      logger.warn({ err }, "KV cache GET failed, returning null");
      return null;
    }
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    try {
      const expirationTtl = Math.max(1, Math.ceil(ttlMs / 1000));
      await this.kv.put(key, value, { expirationTtl });
    } catch (err) {
      logger.warn({ err }, "KV cache SET failed, skipping cache write");
    }
  }
}

class RedisCache implements CacheAdapter {
  constructor(private readonly client: ReturnType<typeof createClient>) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      logger.warn({ err }, "Redis GET failed, returning null");
      return null;
    }
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    try {
      await this.client.set(key, value, { PX: ttlMs });
    } catch (err) {
      logger.warn({ err }, "Redis SET failed, skipping cache write");
    }
  }
}

let _cache: CacheAdapter | null = null;

export async function getCache(): Promise<CacheAdapter> {
  if (_cache) return _cache;

  const kv = getAiCacheKv();
  if (kv) {
    logger.info("Content cache: using Cloudflare KV");
    _cache = new KvCache(kv);
    return _cache;
  }

  const redisUrl = process.env["REDIS_URL"];
  if (redisUrl) {
    try {
      const client = createClient({ url: redisUrl });
      client.on("error", (err: unknown) => logger.warn({ err }, "Redis client error"));
      await client.connect();
      logger.info("Content cache: using Redis");
      _cache = new RedisCache(client);
      return _cache;
    } catch (err) {
      logger.warn({ err }, "Redis connection failed, falling back to in-memory LRU cache");
    }
  }

  logger.info("Content cache: using in-memory LRU (max 500 entries)");
  _cache = new InMemoryLruCache(500);
  return _cache;
}
