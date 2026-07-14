import { setD1Binding } from "@workspace/db";
import { wireCfEdgeEnv } from "@workspace/cf-edge/wire";
import { corsPreflight, withCors } from "@workspace/cf-edge/cors";
import { kvGetJson } from "@workspace/cf-edge/kv-cache";
import { verifySessionClaims } from "@workspace/cf-edge/jwt";
import type { CfEdgeBindings } from "@workspace/cf-edge/bindings";
import { handleAuthenticatedRead } from "./api-routes";

export interface Env extends CfEdgeBindings {
  DB_DIALECT: string;
  CF_EDGE_HTTP: string;
  AUTH_SECRET: string;
}

async function requireAuth(request: Request, env: Env) {
  const secret = env.AUTH_SECRET;
  if (!secret) return null;
  return verifySessionClaims(request, secret);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    wireCfEdgeEnv(env);
    setD1Binding(env.DB);
    const preflight = corsPreflight(request);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/" && request.method === "GET") {
      return withCors(request, Response.json({ status: "ok", worker: "goals-ac-read" }));
    }

    if (path.match(/^\/api\/jobs\/[^/]+$/) && request.method === "GET") {
      const jobId = path.split("/").pop()!;
      const status = await kvGetJson(env.AI_CACHE, `job:status:${jobId}`);
      return withCors(
        request,
        Response.json(status ?? { jobId, status: "pending" }),
      );
    }

    const session = await requireAuth(request, env);
    if (!session?.id) {
      return withCors(request, Response.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const userId = Number.parseInt(session.id, 10);

    try {
      const handled = await handleAuthenticatedRead(request, path, userId);
      if (handled) return handled;
      return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    } catch (err) {
      console.error("[goals-ac-read]", path, err);
      return withCors(request, Response.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
};
