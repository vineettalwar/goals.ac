import type { AuthenticatedApiKey } from "@workspace/content-engine/support/auth/api-key-auth";

export type McpToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  openWorldHint: boolean;
};

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  annotations: McpToolAnnotations;
};

export type McpToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  structuredContent?: unknown;
};

export type McpToolContext = {
  key: AuthenticatedApiKey;
  /** Origin of the MCP HTTP request — used to proxy generate to the public API. */
  requestOrigin?: string;
  /** Raw Authorization header (Bearer gac_…) for proxied generate calls. */
  authorizationHeader?: string;
};

export class McpToolError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_params" | "forbidden" | "not_found" | "failed" = "failed",
  ) {
    super(message);
    this.name = "McpToolError";
  }
}
