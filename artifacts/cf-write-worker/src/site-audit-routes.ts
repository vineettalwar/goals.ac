import { withCors } from "@workspace/cf-edge/cors";
import { db } from "@workspace/db";
import { siteAuditsTable, websiteProjectsTable } from "@workspace/db/schema-sqlite";
import { assertPublicUrlSync } from "@workspace/security/ssrf-guard";
import { processSiteAuditCrawl } from "@workspace/jobs/handlers";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAccessibleProject } from "./project-access";

function normalizeHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const CreateBody = z.object({
  startUrl: z.string().min(1).optional(),
  maxPages: z.coerce.number().int().min(1).max(100).optional(),
  /** Run crawl in this request instead of queueing (useful when worker is down). */
  sync: z.boolean().optional(),
});

export async function handleSiteAuditWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/site-audits$/);
  if (!match || request.method !== "POST") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const parsed = CreateBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const [row] = await db
    .select({ url: websiteProjectsTable.url })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, projectId))
    .limit(1);

  if (!row) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const startUrl = normalizeHttpUrl(parsed.data.startUrl ?? row.url);
  try {
    assertPublicUrlSync(startUrl);
  } catch (err) {
    return withCors(
      request,
      Response.json(
        { error: err instanceof Error ? err.message : "Invalid URL" },
        { status: 422 },
      ),
    );
  }

  const maxPages = parsed.data.maxPages ?? 50;
  const [audit] = await db
    .insert(siteAuditsTable)
    .values({
      websiteProjectId: projectId,
      startUrl,
      status: "pending",
      maxPages,
    })
    .returning();

  if (!audit) {
    return withCors(request, Response.json({ error: "Failed to create audit" }, { status: 500 }));
  }

  const runSync = async () => {
    await processSiteAuditCrawl({ siteAuditId: audit.id });
    const [fresh] = await db
      .select()
      .from(siteAuditsTable)
      .where(eq(siteAuditsTable.id, audit.id))
      .limit(1);
    return fresh ?? audit;
  };

  if (parsed.data.sync) {
    try {
      const fresh = await runSync();
      return withCors(request, Response.json(fresh, { status: 201 }));
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Site audit failed", id: audit.id },
          { status: 502 },
        ),
      );
    }
  }

  try {
    await sendToCfQueue(QUEUES.siteAuditCrawl, { siteAuditId: audit.id });
    return withCors(request, Response.json({ ...audit, queued: true }, { status: 202 }));
  } catch {
    try {
      const fresh = await runSync();
      return withCors(request, Response.json(fresh, { status: 201 }));
    } catch (inlineErr) {
      return withCors(
        request,
        Response.json(
          {
            error:
              inlineErr instanceof Error ? inlineErr.message : "Failed to queue site audit",
            id: audit.id,
          },
          { status: 502 },
        ),
      );
    }
  }
}
