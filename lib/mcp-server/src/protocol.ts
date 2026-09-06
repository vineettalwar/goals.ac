import type { McpToolContext } from "./types";
import { MCP_TOOLS, dispatchTool } from "./tools";

export type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "goals-ac", version: "0.1.0" };

function rpcOk(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function rpcErr(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined && { data }) } };
}

export function parseJsonRpcBody(raw: unknown): JsonRpcRequest {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw rpcErr(null, -32700, "Parse error: body must be a JSON object");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.method !== "string" || !obj.method) {
    throw rpcErr(
      (obj.id as string | number | null) ?? null,
      -32600,
      "Invalid request: method must be a non-empty string",
    );
  }
  return {
    jsonrpc: (obj.jsonrpc as "2.0") ?? undefined,
    id: (obj.id as string | number | null) ?? undefined,
    method: obj.method as string,
    params: obj.params,
  };
}

export async function handleMcpJsonRpc(
  body: JsonRpcRequest,
  ctx: McpToolContext,
): Promise<JsonRpcResponse | null> {
  const id = body.id ?? null;
  const isNotification = body.id === undefined || body.id === null;

  switch (body.method) {
    case "initialize":
      return rpcOk(id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {} },
      });

    case "notifications/initialized":
      return null;

    case "ping":
      return rpcOk(id, {});

    case "tools/list": {
      const tools = MCP_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: t.annotations,
      }));
      return rpcOk(id, { tools });
    }

    case "tools/call": {
      const params = (body.params ?? {}) as Record<string, unknown>;
      const toolName = params.name as string | undefined;
      if (!toolName) {
        return rpcErr(id, -32602, "Missing params.name for tools/call");
      }
      const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;
      const result = await dispatchTool(toolName, ctx, toolArgs);
      return rpcOk(id, {
        content: result.content,
        ...(result.isError && { isError: true }),
        ...(result.structuredContent !== undefined && { structuredContent: result.structuredContent }),
      });
    }

    default:
      if (isNotification) return null;
      return rpcErr(id, -32601, `Method not found: ${body.method}`);
  }
}
