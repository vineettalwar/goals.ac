import { describe, it, expect } from "vitest";
import { handleMcpJsonRpc, parseJsonRpcBody } from "./protocol";
import type { McpToolContext } from "./types";
import type { AuthenticatedApiKey } from "@workspace/content-engine/support/auth/api-key-auth";

const fakeKey: AuthenticatedApiKey = {
  id: 1,
  organizationId: 42,
  scopes: ["content:read", "content:generate"],
  rateLimitPerHour: 100,
};

const fakeCtx: McpToolContext = { key: fakeKey };

describe("parseJsonRpcBody", () => {
  it("rejects non-object", () => {
    expect(() => parseJsonRpcBody(null)).toThrow();
    expect(() => parseJsonRpcBody("hello")).toThrow();
    expect(() => parseJsonRpcBody([1])).toThrow();
  });

  it("rejects missing method", () => {
    expect(() => parseJsonRpcBody({ id: 1 })).toThrow();
  });

  it("parses valid request", () => {
    const req = parseJsonRpcBody({ jsonrpc: "2.0", id: 1, method: "ping" });
    expect(req.method).toBe("ping");
    expect(req.id).toBe(1);
  });
});

describe("handleMcpJsonRpc", () => {
  it("initialize returns serverInfo", async () => {
    const res = await handleMcpJsonRpc({ jsonrpc: "2.0", id: 1, method: "initialize" }, fakeCtx);
    expect(res).not.toBeNull();
    expect(res!.id).toBe(1);
    const result = res!.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.serverInfo).toEqual({ name: "goals-ac", version: "0.1.0" });
    expect(result.capabilities).toEqual({ tools: {} });
  });

  it("notifications/initialized returns null", async () => {
    const res = await handleMcpJsonRpc({ method: "notifications/initialized" }, fakeCtx);
    expect(res).toBeNull();
  });

  it("ping returns empty object", async () => {
    const res = await handleMcpJsonRpc({ jsonrpc: "2.0", id: 2, method: "ping" }, fakeCtx);
    expect(res).not.toBeNull();
    expect(res!.result).toEqual({});
  });

  it("tools/list includes all 9 tool names", async () => {
    const res = await handleMcpJsonRpc({ jsonrpc: "2.0", id: 3, method: "tools/list" }, fakeCtx);
    expect(res).not.toBeNull();
    const result = res!.result as { tools: Array<{ name: string }> };
    const names = result.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "generate_content_piece",
      "get_audit_issues",
      "get_project",
      "get_project_context",
      "get_publish_readiness",
      "list_keyword_opportunities",
      "list_projects",
      "run_site_audit",
      "whoami",
    ]);
  });

  it("tools/call with unknown tool returns isError", async () => {
    const res = await handleMcpJsonRpc(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "no_such_tool", arguments: {} },
      },
      fakeCtx,
    );
    expect(res).not.toBeNull();
    const result = res!.result as { isError?: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("unknown method returns -32601", async () => {
    const res = await handleMcpJsonRpc({ jsonrpc: "2.0", id: 5, method: "bogus/method" }, fakeCtx);
    expect(res).not.toBeNull();
    expect(res!.error?.code).toBe(-32601);
  });
});
