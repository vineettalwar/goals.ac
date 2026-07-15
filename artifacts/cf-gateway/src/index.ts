import { corsPreflight, withCors } from "@workspace/cf-edge/cors";

export interface Env {
  PUBLIC: Fetcher;
  READ: Fetcher;
  WRITE: Fetcher;
  CF_EDGE_HTTP: string;
}

const PUBLIC_PREFIXES = [
  "/api/platform/status",
  "/api/industries",
  "/api/locations",
  "/api/plans",
  "/api/contact",
  "/api/waitlist",
  "/api/webhooks/stripe",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/google",
  "/api/auth/linkedin",
  "/api/auth/twitter",
  "/api/auth/meta",
  "/api/auth/bluesky",
  "/api/auth/mastodon",
  "/api/auth/bing-webmaster",
  "/api/auth/google-search-console",
  "/api/auth/google-analytics",
  "/api/auth/google-sheets",
  "/api/public/",
  "/api/tools/",
  "/api/v1/",
  "/api/analytics/vitals",
];

const PUBLIC_EXACT_PATHS = [
  "/oauth/bluesky-client-metadata.json",
  "/oauth/bluesky-jwks.json",
];

const WRITE_PREFIXES = [
  "/api/content-pieces/generate",
  "/api/geo-audits/generate",
];

function isPublicPath(path: string): boolean {
  if (PUBLIC_EXACT_PATHS.includes(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));
}

function isReadPath(path: string, method: string): boolean {
  if (
    method === "POST" &&
    /^\/api\/website-projects\/\d+\/search-properties\/available$/.test(path)
  ) {
    return true;
  }
  if (
    method === "POST" &&
    /^\/api\/website-projects\/\d+\/analytics-properties\/available$/.test(path)
  ) {
    return true;
  }
  if (method === "GET" || method === "HEAD") {
    if (path === "/api/auth/me") return true;
    if (path === "/api/platform/stock-images/status") return true;
    if (path === "/api/auth/api-key") return true;
    if (path === "/api/auth/openai-credentials") return true;
    if (path === "/api/auth/anthropic-credentials") return true;
    if (path === "/api/auth/bedrock-credentials") return true;
    if (path === "/api/auth/semrush-credentials") return true;
    if (path === "/api/auth/deepl-credentials") return true;
    if (path === "/api/auth/stock-credentials") return true;
    if (path === "/api/billing/status") return true;
    if (path === "/api/billing/credits") return true;
    if (path === "/api/billing/credits/top-up") return true;
    if (path === "/api/organizations/security") return true;
    if (path.startsWith("/api/content-strategies")) return true;
    if (/^\/api\/roadmaps\/[^/]+$/.test(path)) return true;
    if (path === "/api/competitor-analysis") return true;
    if (/^\/api\/competitor-analyses\/\d+$/.test(path)) return true;
    if (/^\/api\/keyword-analyses\/\d+$/.test(path)) return true;
    if (path === "/api/internal-links") return true;
    if (path === "/api/user/cms-summary") return true;
    if (/^\/api\/website-projects\/\d+\/competitors$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/brand-voice\/skill$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/brand-voice\/sources$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/brand-profile\/platform-voice$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/brand-profile\/platform-voice\/[^/]+$/.test(path)) {
      return true;
    }
    if (path === "/api/platform/stock-images/status") return true;
    if (/^\/api\/website-projects\/\d+\/content$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/gsc-queries$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/analytics-properties$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/brand-profile\/voice$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/article-performance$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/semrush\/status$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/keyword-alerts$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/keyword-opportunities$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/command-center$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/publish-records$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/article-ideas$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/article-idea-sources$/.test(path)) return true;
    if (path === "/api/tracked-keywords") return true;
    if (/^\/api\/tracked-keywords\/\d+\/snapshots$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/visibility$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/search-properties\/gsc\/sync-status$/.test(path)) {
      return true;
    }
    if (path === "/api/partner/projects") return true;
    if (path.startsWith("/api/admin/")) return true;
    if (path.startsWith("/api/jobs/")) return true;
    if (path.startsWith("/api/auth/mfa/")) return true;
    if (path === "/api/onboarding/fast-lane") return true;
    if (path === "/api/auth/gemini-key") return true;
    if (path === "/api/conversations") return true;
    if (path === "/api/personas") return true;
    if (path === "/api/org/api-keys") return true;
    if (/^\/api\/seo-articles\/\d+$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/deepl-credentials$/.test(path)) return true;
    if (/^\/api\/website-projects\/\d+\/stock-credentials$/.test(path)) return true;
    return !isPublicPath(path) && !path.startsWith("/api/auth/");
  }
  return false;
}

function isWritePath(path: string, method: string): boolean {
  // Integration health probes run in the write worker (shared handler for GET+POST).
  if (
    /^\/api\/website-projects\/\d+\/integrations\/health$/.test(path) &&
    (method === "GET" || method === "HEAD" || method === "POST")
  ) {
    return true;
  }
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  if (path.startsWith("/api/admin") && method !== "GET" && method !== "HEAD") {
    return true;
  }
  if (WRITE_PREFIXES.some((p) => path === p || path.startsWith(p))) return true;
  if (path === "/api/website-projects" && method === "POST") return true;
  if (path === "/api/organizations/members" && method === "POST") return true;
  if (/^\/api\/organizations\/members\/\d+$/.test(path) && (method === "PATCH" || method === "DELETE")) {
    return true;
  }
  if (/^\/api\/website-projects\/\d+$/.test(path) && (method === "PATCH" || method === "DELETE")) {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/autopilot-settings$/.test(path) && method === "PATCH") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/crawl$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/visibility-settings$/.test(path) && method === "PATCH") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/visibility\/check$/.test(path) && method === "POST") {
    return true;
  }
  if (path === "/api/tracked-keywords" && method === "POST") return true;
  if (path === "/api/tracked-keywords" && method === "DELETE") return true;
  if (/^\/api\/tracked-keywords\/\d+$/.test(path) && method === "DELETE") return true;
  if (path === "/api/keyword-analysis" && method === "POST") return true;
  if (/^\/api\/keyword-opportunities\/\d+$/.test(path) && (method === "POST" || method === "PATCH")) {
    return true;
  }
  if (/^\/api\/keyword-opportunities\/\d+\/brief$/.test(path) && method === "GET") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/keyword-opportunities$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/keyword-clusters$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/article-ideas$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/article-ideas\/import$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/article-idea-sources$/.test(path) && (method === "POST" || method === "DELETE")) {
    return true;
  }
  if (path === "/api/competitor-analysis" && method === "POST") return true;
  if (path === "/api/reddit-discovery" && method === "POST") return true;
  if (path === "/api/topical-map" && method === "POST") return true;
  if (/^\/api\/keyword-rank-alerts\/\d+$/.test(path) && method === "PATCH") return true;
  if (/^\/api\/website-projects\/\d+\/brand-voice\/skill$/.test(path) && (method === "PUT" || method === "POST")) {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/brand-voice\/ingest$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/brand-profile\/platform-voice\/[^/]+$/.test(path) && method === "PUT") {
    return true;
  }
  if (path === "/api/auth/gemini-key" && (method === "POST" || method === "DELETE")) return true;
  if (path === "/api/chat" && method === "POST") return true;
  if (path === "/api/conversations" && method === "DELETE") return true;
  if (path === "/api/companies/humanization" && method === "POST") return true;
  if (path === "/api/org/api-keys" && method === "POST") return true;
  if (/^\/api\/org\/api-keys\/\d+$/.test(path) && method === "DELETE") return true;
  if (/^\/api\/personas\/\d+$/.test(path) && (method === "PATCH" || method === "DELETE")) return true;
  if (/^\/api\/seo-articles\/\d+$/.test(path) && method === "PATCH") return true;
  if (path === "/api/wordpress/test" && method === "POST") return true;
  if (/^\/api\/website-projects\/\d+\/roadmaps\/\d+$/.test(path) && (method === "POST" || method === "DELETE")) {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/deepl-credentials$/.test(path) && (method === "PATCH" || method === "DELETE")) {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/stock-credentials$/.test(path) && (method === "PATCH" || method === "DELETE")) {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/content-pieces\/repurpose$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/content-pieces\/\d+\/repurpose\/stream$/.test(path) && method === "POST") return true;
  if (/^\/api\/website-projects\/\d+\/brand-profile\/platform-voice\/[^/]+\/analyze$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/brand-profile\/platform-voice\/[^/]+\/import$/.test(path) && method === "POST") {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/brand-profile\/voice\/analyze$/.test(path) && method === "POST") {
    return true;
  }
  if (path === "/api/onboarding/fast-lane" && method === "POST") return true;
  if (/^\/api\/content-strategies\/\d+\/items\/\d+$/.test(path) && method === "PATCH") {
    return true;
  }
  if (/^\/api\/content-strategies\/\d+\/items\/\d+\/schedule$/.test(path) && method === "POST") {
    return true;
  }
  if (path === "/api/auth/me" && method === "PATCH") return true;
  if (path === "/api/auth/change-password" && method === "POST") return true;
  if (path === "/api/auth/me/delete" && method === "DELETE") return true;
  if (path === "/api/auth/api-key" && (method === "PATCH" || method === "DELETE")) return true;
  if (path === "/api/auth/api-key/test" && method === "POST") return true;
  if (path === "/api/ai-providers/settings" && method === "PATCH") return true;
  if (path === "/api/auth/openai-credentials" && (method === "PATCH" || method === "DELETE")) return true;
  if (path === "/api/auth/openai-credentials/test" && method === "POST") return true;
  if (path === "/api/auth/anthropic-credentials" && (method === "PATCH" || method === "DELETE")) return true;
  if (path === "/api/auth/anthropic-credentials/test" && method === "POST") return true;
  if (path === "/api/auth/bedrock-credentials" && (method === "PATCH" || method === "DELETE")) return true;
  if (path === "/api/auth/bedrock-credentials/test" && method === "POST") return true;
  if (path === "/api/auth/semrush-credentials" && (method === "PATCH" || method === "DELETE")) return true;
  if (path === "/api/auth/semrush-credentials/test" && method === "POST") return true;
  if (path === "/api/auth/deepl-credentials" && (method === "PATCH" || method === "DELETE")) return true;
  if (path === "/api/auth/deepl-credentials/test" && method === "POST") return true;
  if (path === "/api/auth/stock-credentials" && (method === "PATCH" || method === "DELETE")) return true;
  if (path === "/api/auth/stock-credentials/test" && method === "POST") return true;
  if (path === "/api/billing/portal" && method === "POST") return true;
  if (path === "/api/billing/checkout" && method === "POST") return true;
  if (path === "/api/billing/credits/top-up" && method === "POST") return true;
  if (/^\/api\/invites\/[^/]+$/.test(path) && method === "POST") return true;
  if (path === "/api/organizations/security" && method === "PATCH") return true;
  if (path.startsWith("/api/auth/mfa/") && method === "POST") return true;
  if (path.startsWith("/api/admin/") && method !== "GET" && method !== "HEAD") return true;
  if (path === "/api/goals" && method === "POST") return true;
  if (/^\/api\/goals\/\d+$/.test(path) && (method === "PATCH" || method === "DELETE")) return true;
  if (/^\/api\/goals\/\d+\/compile-briefs$/.test(path) && method === "POST") return true;
  if (path === "/api/briefs" && method === "POST") return true;
  if (/^\/api\/briefs\/\d+$/.test(path) && method === "PATCH") return true;
  if (path.includes("/social/composer") && method === "POST") return true;
  if (path.includes("/social/queue/") && (method === "PATCH" || method === "DELETE")) return true;
  if (path.includes("/social/schedule-settings") && method === "PATCH") return true;
  if (path.includes("/output-mode") && method === "PATCH") return true;
  if (path.includes("/cms-integrations")) {
    if (method === "PATCH" || method === "DELETE") return true;
    if (method === "POST" && /\/cms-integrations\/test$/.test(path)) return true;
  }
  if (
    /^\/api\/website-projects\/\d+\/search-properties$/.test(path) &&
    (method === "PATCH" || method === "DELETE")
  ) {
    return true;
  }
  if (/^\/api\/content-pieces\/\d+$/.test(path) && (method === "PATCH" || method === "DELETE")) {
    return true;
  }
  if (/^\/api\/content-pieces\/\d+\/regenerate$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-pieces\/\d+\/enhance$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-pieces\/\d+\/serp-score$/.test(path) && method === "GET") return true;
  if (/^\/api\/content-pieces\/\d+\/repurpose$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-pieces\/\d+\/images\/regenerate$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-pieces\/\d+\/humanize$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-pieces\/\d+\/approve$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-pieces\/\d+\/reject$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-pieces\/\d+\/submit-review$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-pieces\/\d+\/render-preview$/.test(path) && method === "POST") return true;
  if (/^\/api\/content-items\/\d+$/.test(path) && method === "PATCH") return true;
  if (/^\/api\/website-projects\/\d+\/crawl$/.test(path) && method === "POST") return true;
  if (path.includes("/publish") && method === "POST") return true;
  if (path.includes("/scrape") && method === "POST") return true;
  if (path.includes("/crawl") && method === "POST") return true;
  if (path.includes("/sync") && method === "POST") return true;
  if (path.includes("/generate") && method === "POST" && !path.startsWith("/api/public/")) {
    return true;
  }
  return false;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const preflight = corsPreflight(request);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/" && request.method === "GET") {
      return withCors(
        request,
        Response.json({
          status: "ok",
          worker: "goals-ac-gateway",
          shards: ["public", "read", "write"],
        }),
      );
    }

    if (!path.startsWith("/api/")) {
      if (isPublicPath(path)) {
        const response = await env.PUBLIC.fetch(request);
        return withCors(request, response);
      }
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }

    let target: Fetcher;
    if (/^\/api\/invites\/[^/]+$/.test(path) && request.method === "GET") {
      target = env.PUBLIC;
    } else if (/^\/api\/roadmaps\/[^/]+\/lead-capture$/.test(path) && request.method === "POST") {
      target = env.PUBLIC;
    } else if (isPublicPath(path)) {
      target = env.PUBLIC;
    } else if (isWritePath(path, request.method)) {
      target = env.WRITE;
    } else if (isReadPath(path, request.method)) {
      target = env.READ;
    } else {
      target = env.WRITE;
    }

    const response = await target.fetch(request);
    return withCors(request, response);
  },
};
