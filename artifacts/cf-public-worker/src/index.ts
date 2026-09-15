import { setD1Binding } from "@workspace/db";
import { wireCfEdgeEnv } from "@workspace/cf-edge/wire";
import { corsPreflight, withCors } from "@workspace/cf-edge/cors";
import { handlePublicInviteGet } from "./invite-routes";
import { handleV1Api } from "./v1-api-routes";
import { handleMcpRoute } from "./mcp-routes";
import type { Env } from "./env";
import { handleCatalogRoutes } from "./routes/catalog";
import { handleAuthDispatch } from "./routes/auth-dispatch";
import { handleMarketingRoutes } from "./routes/marketing";
import { handlePublicToolsRoutes } from "./routes/public-tools";

export type { Env } from "./env";

async function handle(request: Request, env: Env): Promise<Response> {
  const preflight = corsPreflight(request);
  if (preflight) return preflight;

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    const catalog = await handleCatalogRoutes(request, path, env);
    if (catalog) return catalog;

    const auth = await handleAuthDispatch(request, path, env);
    if (auth) return auth;

    const inviteHandled = await handlePublicInviteGet(request, path);
    if (inviteHandled) return inviteHandled;

    const mcpHandled = await handleMcpRoute(request, path, env);
    if (mcpHandled) return mcpHandled;

    const v1Handled = await handleV1Api(request, path, env);
    if (v1Handled) return v1Handled;

    const marketing = await handleMarketingRoutes(request, path);
    if (marketing) return marketing;

    const tools = await handlePublicToolsRoutes(request, path, env);
    if (tools) return tools;

    if (path === "/" && request.method === "GET") {
      return withCors(
        request,
        Response.json({ status: "ok", worker: "goals-ac-public" }),
      );
    }

    return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
  } catch (err) {
    console.error("[goals-ac-public]", path, err);
    return withCors(
      request,
      Response.json({ error: "Internal server error" }, { status: 500 }),
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    wireCfEdgeEnv(env);
    setD1Binding(env.DB);
    return handle(request, env);
  },
};
