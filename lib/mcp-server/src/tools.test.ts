import { describe, expect, it } from "vitest";
import { MCP_TOOLS, dispatchTool } from "./tools";
import type { McpToolContext } from "./types";

const ctx: McpToolContext = {
  key: {
    id: 1,
    organizationId: 9,
    scopes: ["content:read", "content:generate"],
    rateLimitPerHour: 60,
  },
};

describe("MCP tool catalog", () => {
  it("exposes Feature 3 tools with annotations", () => {
    const names = MCP_TOOLS.map((t) => t.name);
    expect(names).toContain("list_projects");
    expect(names).toContain("run_site_audit");
    expect(names).toContain("generate_content_piece");
    expect(names).toContain("whoami");
    expect(names).toContain("get_project_context");
    expect(names).toContain("get_backlinks_overview");

    const audit = MCP_TOOLS.find((t) => t.name === "run_site_audit")!;
    expect(audit.annotations.openWorldHint).toBe(true);
    expect(audit.annotations.readOnlyHint).toBe(false);

    const backlinks = MCP_TOOLS.find((t) => t.name === "get_backlinks_overview")!;
    expect(backlinks.annotations.readOnlyHint).toBe(true);
    expect(backlinks.annotations.openWorldHint).toBe(true);

    const list = MCP_TOOLS.find((t) => t.name === "list_projects")!;
    expect(list.annotations.readOnlyHint).toBe(true);
    expect(list.annotations.destructiveHint).toBe(false);
  });

  it("returns an error for unknown tools without throwing", async () => {
    const result = await dispatchTool("nope", ctx, {});
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/Unknown tool/);
  });

  it("whoami returns key identity without DB", async () => {
    const result = await dispatchTool("whoami", ctx, {});
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      organizationId: 9,
      scopes: ["content:read", "content:generate"],
    });
  });
});
