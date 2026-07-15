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
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/google",
  "/api/public/",
  "/api/tools/",
];

const WRITE_PREFIXES = [
  "/api/content-pieces/generate",
  "/api/geo-audits/generate",
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));
}

function isReadPath(path: string, method: string): boolean {
  if (method === "GET" || method === "HEAD") {
    if (path === "/api/auth/me") return true;
    if (path === "/api/auth/api-key") return true;
    if (path === "/api/auth/openai-credentials") return true;
    if (path === "/api/auth/anthropic-credentials") return true;
    if (path.startsWith("/api/jobs/")) return true;
    return !isPublicPath(path) && !path.startsWith("/api/auth/");
  }
  return false;
}

function isWritePath(path: string, method: string): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  if (WRITE_PREFIXES.some((p) => path === p || path.startsWith(p))) return true;
  if (path === "/api/website-projects" && method === "POST") return true;
  if (/^\/api\/website-projects\/\d+$/.test(path) && (method === "PATCH" || method === "DELETE")) {
    return true;
  }
  if (/^\/api\/website-projects\/\d+\/autopilot-settings$/.test(path) && method === "PATCH") {
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
  if (path.includes("/cms-integrations")) {
    if (method === "PATCH" || method === "DELETE") return true;
    if (method === "POST" && /\/cms-integrations\/test$/.test(path)) return true;
  }
  if (path.includes("/publish") && method === "POST") return true;
  if (path.includes("/scrape") && method === "POST") return true;
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
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    }

    let target: Fetcher;
    if (isPublicPath(path)) {
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
