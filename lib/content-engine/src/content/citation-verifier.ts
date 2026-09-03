/**
 * Verifies that citation URLs the generator emits actually resolve, so
 * `assessPublishReadiness({ verifiedCitationUrls })` has real data instead of
 * skipping the check. Node-only: it goes through the SSRF guard's async
 * `assertPublicUrl`, which does a DNS lookup via `node:dns/promises` and
 * therefore cannot run on a Cloudflare Workers / edge bundle. Call this from
 * the pg-boss worker or a Next.js Node-runtime route, never from an edge
 * route or Worker script.
 *
 * Every outbound request goes through `assertPublicUrl` first: this fetches
 * URLs an LLM invented, which makes it an SSRF sink by construction.
 */
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { logger } from "../core/logger";

export type CitationVerdict = "reachable" | "unreachable" | "skipped";

export type CitationCheck = {
  url: string;
  verdict: CitationVerdict;
  /** HTTP status when we got one. */
  status?: number;
  /** Why the check came back unreachable or skipped. */
  reason?: string;
  /** .gov/.edu/known research sources = high; other resolvable https = medium; else unknown. */
  authorityTier?: "high" | "medium" | "unknown";
};

export type VerifyCitationsResult = {
  checks: CitationCheck[];
  /** Feeds assessPublishReadiness({ verifiedCitationUrls }) directly. */
  verifiedUrls: string[];
};

export type VerifyCitationsOptions = {
  /** Per-request timeout in ms. Default 5000. */
  timeoutMs?: number;
  /** Max in-flight requests. Default 5. */
  concurrency?: number;
  /** How long a cached verdict stays valid, in ms. Default 24h. */
  cacheTtlMs?: number;
};

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_REDIRECT_HOPS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * A short, honest list of domains known to be high-authority research or
 * standards bodies. Kept intentionally small: this is not a ranking system,
 * just a hint for editors triaging citations. Everything else that resolves
 * over https is "medium", nothing invents a finer-grained score.
 */
const HIGH_AUTHORITY_DOMAINS = new Set([
  "who.int",
  "nih.gov",
  "cdc.gov",
  "nist.gov",
  "w3.org",
  "ietf.org",
  "oecd.org",
  "un.org",
  "worldbank.org",
  "nature.com",
  "sciencedirect.com",
  "pubmed.ncbi.nlm.nih.gov",
  "arxiv.org",
]);

type CacheEntry = { check: CitationCheck; expiresAt: number };

/**
 * In-memory TTL cache keyed by URL. `citation-verifier` runs inside a single
 * worker process per retry loop, so a module-level Map is enough: it avoids
 * re-hitting the same source repeatedly without needing the shared
 * KV/Redis cache in core/cache.ts (that cache is keyed for cross-process AI
 * response reuse, not per-URL reachability, and json-stringifying a
 * CitationCheck through it would add cost for no benefit here).
 */
const verdictCache = new Map<string, CacheEntry>();

function getCached(url: string, ttlMs: number): CitationCheck | null {
  const entry = verdictCache.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    verdictCache.delete(url);
    return null;
  }
  return entry.check;
}

function setCached(url: string, check: CitationCheck, ttlMs: number): void {
  verdictCache.set(url, { check, expiresAt: Date.now() + ttlMs });
}

/** Exposed for tests that need a clean cache between cases. */
export function clearCitationVerifierCache(): void {
  verdictCache.clear();
}

function authorityTierFor(url: string): "high" | "medium" | "unknown" {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown";
  }

  if (hostname.endsWith(".gov") || hostname.endsWith(".edu")) return "high";
  if (HIGH_AUTHORITY_DOMAINS.has(hostname)) return "high";

  const parts = hostname.split(".");
  const bareDomain = parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
  if (HIGH_AUTHORITY_DOMAINS.has(bareDomain)) return "high";

  return "medium";
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function checkOne(url: string, timeoutMs: number): Promise<CitationCheck> {
  const authorityTier = authorityTierFor(url);

  try {
    await assertPublicUrl(url);
  } catch (err) {
    return {
      url,
      verdict: "skipped",
      reason: err instanceof Error ? err.message : "Rejected by SSRF guard",
      authorityTier,
    };
  }

  // Redirects are followed by hand so every hop is re-checked by the SSRF
  // guard. Letting fetch follow them would validate only the first URL, and a
  // citation host that 302s to a link-local or private address would sail past.
  const attempt = async (method: "HEAD" | "GET"): Promise<Response> => {
    let current = url;

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
      const { signal, clear } = withTimeout(timeoutMs);
      let response: Response;
      try {
        response = await fetch(current, { method, signal, redirect: "manual" });
      } finally {
        clear();
      }

      if (!REDIRECT_STATUSES.has(response.status)) return response;

      const location = response.headers.get("location");
      if (!location) return response;

      current = new URL(location, current).toString();
      await assertPublicUrl(current);
    }

    throw new Error(`Exceeded ${MAX_REDIRECT_HOPS} redirects`);
  };

  try {
    let response = await attempt("HEAD");
    if (response.status === 405 || response.status === 501) {
      response = await attempt("GET");
    }

    if (response.status >= 200 && response.status < 400) {
      return { url, verdict: "reachable", status: response.status, authorityTier };
    }

    return {
      url,
      verdict: "unreachable",
      status: response.status,
      reason: `HTTP ${response.status}`,
      authorityTier,
    };
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? `Timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : "Network error";
    return { url, verdict: "unreachable", reason, authorityTier };
  }
}

/**
 * Verify a batch of citation URLs with bounded concurrency and a TTL cache.
 * Never throws: a malformed or unreachable URL comes back as a verdict, not
 * an exception, because a verifier that throws would break generation.
 */
export async function verifyCitations(
  urls: string[],
  options: VerifyCitationsOptions = {},
): Promise<VerifyCitationsResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  const uniqueUrls = [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  const checks: CitationCheck[] = new Array(uniqueUrls.length);

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < uniqueUrls.length) {
      const index = cursor;
      cursor += 1;
      const url = uniqueUrls[index]!;

      const cached = getCached(url, cacheTtlMs);
      if (cached) {
        checks[index] = cached;
        continue;
      }

      let check: CitationCheck;
      try {
        check = await checkOne(url, timeoutMs);
      } catch (err) {
        logger.warn({ err, url }, "citation-verifier: unexpected error, treating as unreachable");
        check = { url, verdict: "unreachable", reason: "Unexpected verifier error" };
      }

      setCached(url, check, cacheTtlMs);
      checks[index] = check;
    }
  }

  const workerCount = Math.min(concurrency, uniqueUrls.length) || 0;
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const verifiedUrls = checks.filter((c) => c.verdict === "reachable").map((c) => c.url);
  return { checks, verifiedUrls };
}
