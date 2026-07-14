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
  "/api/contact",
  "/api/waitlist",
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
    if (path.startsWith("/api/jobs/")) return true;
    return !isPublicPath(path) && !path.startsWith("/api/auth/");
  }
  return false;
}

function isWritePath(path: string, method: string): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  if (WRITE_PREFIXES.some((p) => path === p || path.startsWith(p))) return true;
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
      target = env.READ;
    }

    const response = await target.fetch(request);
    return withCors(request, response);
  },
};
