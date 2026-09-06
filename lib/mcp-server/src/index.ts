export type {
  McpToolAnnotations,
  McpToolDefinition,
  McpToolResult,
  McpToolContext,
} from "./types";
export { McpToolError } from "./types";

export {
  listProjects,
  getProject,
  getProjectContext,
  runSiteAudit,
  getAuditIssues,
  listKeywordOpportunities,
  generateContentPiece,
  getPublishReadiness,
  whoami,
  inspectUrl,
} from "./handlers";

export { MCP_TOOLS, dispatchTool } from "./tools";
export { handleMcpJsonRpc, parseJsonRpcBody } from "./protocol";
export type { JsonRpcRequest, JsonRpcResponse } from "./protocol";

import {
  authenticateApiKey,
  checkApiKeyRateLimit,
} from "@workspace/content-engine/support/auth/api-key-auth";
import { parseJsonRpcBody, handleMcpJsonRpc } from "./protocol";
import type { McpToolContext } from "./types";

export async function handleMcpHttpRequest(opts: {
  authorizationHeader: string | undefined;
  requestOrigin: string;
  body: unknown;
}): Promise<{ status: number; body: unknown }> {
  const key = await authenticateApiKey(opts.authorizationHeader);
  if (!key) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (!checkApiKeyRateLimit(key)) {
    return { status: 429, body: { error: "Rate limit exceeded" } };
  }

  let request;
  try {
    request = parseJsonRpcBody(opts.body);
  } catch (parseError) {
    return { status: 200, body: parseError };
  }

  const ctx: McpToolContext = {
    key,
    requestOrigin: opts.requestOrigin,
    authorizationHeader: opts.authorizationHeader,
  };

  const response = await handleMcpJsonRpc(request, ctx);
  if (response === null) {
    return { status: 204, body: null };
  }
  return { status: 200, body: response };
}
