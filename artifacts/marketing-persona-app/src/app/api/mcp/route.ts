import { NextResponse } from "next/server";
import { handleMcpHttpRequest, MCP_TOOLS } from "@workspace/mcp-server";

export const runtime = "nodejs";

function requestOrigin(req: Request): string {
  const configured =
    process.env["APP_ORIGIN"]?.trim() ||
    process.env["NEXTAUTH_URL"]?.trim() ||
    process.env["NEXT_PUBLIC_APP_URL"]?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* fall through */
    }
  }
  return new URL(req.url).origin;
}

/**
 * goals.ac MCP endpoint — Bearer `gac_…` API keys (same as /api/v1).
 *
 * Clients: POST JSON-RPC (`initialize`, `tools/list`, `tools/call`) to `/api/mcp`.
 * Optional GET returns a short discovery document.
 */
export async function GET() {
  return NextResponse.json({
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
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body == null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await handleMcpHttpRequest({
    authorizationHeader: req.headers.get("authorization") ?? undefined,
    requestOrigin: requestOrigin(req),
    body,
  });

  if (result.status === 204 || result.body == null) {
    return new NextResponse(null, { status: result.status === 204 ? 204 : result.status });
  }
  return NextResponse.json(result.body, { status: result.status });
}
