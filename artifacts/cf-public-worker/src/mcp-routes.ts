import { withCors } from "@workspace/cf-edge/cors";
import { handleMcpHttpRequest, MCP_TOOLS } from "@workspace/mcp-server";

function requestOrigin(request: Request, env: { APP_URL?: string }): string {
  const configured = env.APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* fall through */
    }
  }
  return new URL(request.url).origin;
}

export async function handleMcpRoute(
  request: Request,
  path: string,
  env: { APP_URL?: string },
): Promise<Response | null> {
  if (path !== "/api/mcp") return null;

  if (request.method === "GET") {
    return withCors(
      request,
      Response.json({
        name: "goals-ac",
        version: "0.1.0",
        transport: "http+jsonrpc",
        endpoint: "/api/mcp",
        auth: "Authorization: Bearer gac_…",
        scopes: {
          read: "content:read",
          writeAuditOrGenerate: "content:generate",
        },
        tools: MCP_TOOLS.map((t) => t.name),
        docs: ".agents/skills/goals-ac-seo-loop/SKILL.md",
      }),
    );
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    if (body == null) {
      return withCors(
        request,
        Response.json({ error: "Invalid JSON body" }, { status: 400 }),
      );
    }

    const result = await handleMcpHttpRequest({
      authorizationHeader: request.headers.get("authorization") ?? undefined,
      requestOrigin: requestOrigin(request, env),
      body,
    });

    if (result.status === 204 || result.body == null) {
      return withCors(
        request,
        new Response(null, { status: result.status === 204 ? 204 : result.status }),
      );
    }
    return withCors(request, Response.json(result.body, { status: result.status }));
  }

  return null;
}
