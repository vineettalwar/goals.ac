import { withCors } from "@workspace/cf-edge/cors";
import { db } from "./db";
import {
  siteAuditsTable,
  siteAuditIssuesTable,
  siteAuditPagesTable,
} from "@workspace/db/schema-sqlite";
import { and, desc, eq } from "drizzle-orm";
import { getAccessibleProject } from "./project-access";

export async function handleSiteAuditRead(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;

  const detailMatch = path.match(/^\/api\/website-projects\/(\d+)\/site-audits\/(\d+)$/);
  if (detailMatch && method === "GET") {
    const projectId = Number.parseInt(detailMatch[1]!, 10);
    const auditId = Number.parseInt(detailMatch[2]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const [audit] = await db
      .select()
      .from(siteAuditsTable)
      .where(
        and(eq(siteAuditsTable.id, auditId), eq(siteAuditsTable.websiteProjectId, projectId)),
      )
      .limit(1);

    if (!audit) {
      return withCors(request, Response.json({ error: "Audit not found" }, { status: 404 }));
    }

    const [issues, pages] = await Promise.all([
      db.select().from(siteAuditIssuesTable).where(eq(siteAuditIssuesTable.siteAuditId, auditId)),
      db.select().from(siteAuditPagesTable).where(eq(siteAuditPagesTable.siteAuditId, auditId)),
    ]);

    const bySeverity = {
      critical: issues.filter((i) => i.severity === "critical"),
      warning: issues.filter((i) => i.severity === "warning"),
      info: issues.filter((i) => i.severity === "info"),
    };

    return withCors(request, Response.json({ audit, pages, issues, bySeverity }));
  }

  const listMatch = path.match(/^\/api\/website-projects\/(\d+)\/site-audits$/);
  if (listMatch && method === "GET") {
    const projectId = Number.parseInt(listMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const audits = await db
      .select({
        id: siteAuditsTable.id,
        startUrl: siteAuditsTable.startUrl,
        status: siteAuditsTable.status,
        maxPages: siteAuditsTable.maxPages,
        pagesCrawled: siteAuditsTable.pagesCrawled,
        crawlComplete: siteAuditsTable.crawlComplete,
        errorMessage: siteAuditsTable.errorMessage,
        createdAt: siteAuditsTable.createdAt,
        completedAt: siteAuditsTable.completedAt,
      })
      .from(siteAuditsTable)
      .where(eq(siteAuditsTable.websiteProjectId, projectId))
      .orderBy(desc(siteAuditsTable.createdAt))
      .limit(20);

    return withCors(request, Response.json({ audits }));
  }

  return null;
}
