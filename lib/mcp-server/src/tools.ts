import type { McpToolContext, McpToolDefinition, McpToolResult } from "./types";
import {
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
  getBacklinksOverview,
} from "./handlers";

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "whoami",
    description: "Returns the authenticated API key identity: organization, scopes, and rate-limit quota.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "list_projects",
    description: "List all website projects belonging to the authenticated organization.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "get_project",
    description: "Get detailed information about a specific website project.",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "number", description: "Website project ID" } },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "get_project_context",
    description: "Get a project summary with brand profile context (company, industry, audience, keywords).",
    inputSchema: {
      type: "object",
      properties: { projectId: { type: "number", description: "Website project ID" } },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "run_site_audit",
    description: "Start a site audit crawl for a project. Returns audit metadata; crawl runs async unless sync=true.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Website project ID" },
        startUrl: { type: "string", description: "Override start URL (default: project URL)" },
        maxPages: { type: "number", description: "Max pages to crawl (1–100, default 50)" },
        sync: { type: "boolean", description: "Run synchronously instead of queuing" },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "get_audit_issues",
    description: "Get issues from a completed site audit, optionally filtered by severity.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Website project ID" },
        auditId: { type: "number", description: "Site audit ID" },
        severity: { type: "string", enum: ["critical", "warning", "info"], description: "Filter by severity" },
      },
      required: ["projectId", "auditId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "list_keyword_opportunities",
    description: "List keyword opportunities for a project, ranked by opportunity score.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Website project ID" },
        status: { type: "string", enum: ["open", "queued", "dismissed"], description: "Filter by status (default: open)" },
        limit: { type: "number", description: "Max results (1–100, default 25)" },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "generate_content_piece",
    description: "Generate a new content piece for a project using AI.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Website project ID" },
        formatType: { type: "string", description: "Content format (e.g. blog_post, landing_page)" },
        targetKeyword: { type: "string", description: "Primary keyword to target" },
        angleHint: { type: "string", description: "Optional angle or topic hint" },
        intendedPublishPlatform: { type: "string", description: "Target CMS platform" },
      },
      required: ["projectId", "formatType", "targetKeyword"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "get_publish_readiness",
    description: "Check if a content piece is ready to publish (completeness, SEO, quality gates).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Website project ID" },
        contentPieceId: { type: "number", description: "Content piece ID" },
      },
      required: ["projectId", "contentPieceId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "inspect_url",
    description:
      "Request a Google Search Console URL inspection for a published URL. Returns indexing verdict, coverage state, canonical, and last crawl time. Rate-limited to once per URL per 60 minutes. Requires a GSC connection on the project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Website project ID" },
        inspectionUrl: { type: "string", description: "Fully-qualified URL to inspect (must match GSC property)" },
        contentPieceId: { type: "number", description: "Optional content piece ID to associate the inspection with" },
      },
      required: ["projectId", "inspectionUrl"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "get_backlinks_overview",
    description:
      "Fetch a live DataForSEO backlinks overview for a project domain: summary counts (backlinks, referring domains, spam score) plus top referring domains. Requires DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD. No CRM persistence.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Website project ID" },
        referringDomainsLimit: {
          type: "number",
          description: "Max referring domains to return (1–25, default 10)",
        },
      },
      required: ["projectId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
];

const toolHandlers: Record<string, (ctx: McpToolContext, args: Record<string, unknown>) => Promise<McpToolResult> | McpToolResult> = {
  whoami: (ctx) => whoami(ctx),
  list_projects: (ctx) => listProjects(ctx),
  get_project: (ctx, a) => getProject(ctx, { projectId: Number(a.projectId) }),
  get_project_context: (ctx, a) => getProjectContext(ctx, { projectId: Number(a.projectId) }),
  run_site_audit: (ctx, a) =>
    runSiteAudit(ctx, {
      projectId: Number(a.projectId),
      startUrl: a.startUrl as string | undefined,
      maxPages: a.maxPages != null ? Number(a.maxPages) : undefined,
      sync: a.sync as boolean | undefined,
    }),
  get_audit_issues: (ctx, a) =>
    getAuditIssues(ctx, {
      projectId: Number(a.projectId),
      auditId: Number(a.auditId),
      severity: a.severity as string | undefined,
    }),
  list_keyword_opportunities: (ctx, a) =>
    listKeywordOpportunities(ctx, {
      projectId: Number(a.projectId),
      status: a.status as string | undefined,
      limit: a.limit != null ? Number(a.limit) : undefined,
    }),
  generate_content_piece: (ctx, a) =>
    generateContentPiece(ctx, {
      projectId: Number(a.projectId),
      formatType: a.formatType as string,
      targetKeyword: a.targetKeyword as string,
      angleHint: a.angleHint as string | undefined,
      intendedPublishPlatform: a.intendedPublishPlatform as string | undefined,
    }),
  get_publish_readiness: (ctx, a) =>
    getPublishReadiness(ctx, {
      projectId: Number(a.projectId),
      contentPieceId: Number(a.contentPieceId),
    }),
  inspect_url: (ctx, a) =>
    inspectUrl(ctx, {
      projectId: Number(a.projectId),
      inspectionUrl: a.inspectionUrl as string,
      contentPieceId: a.contentPieceId != null ? Number(a.contentPieceId) : undefined,
    }),
  get_backlinks_overview: (ctx, a) =>
    getBacklinksOverview(ctx, {
      projectId: Number(a.projectId),
      referringDomainsLimit:
        a.referringDomainsLimit != null ? Number(a.referringDomainsLimit) : undefined,
    }),
};

export async function dispatchTool(
  name: string,
  ctx: McpToolContext,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  return handler(ctx, args);
}
