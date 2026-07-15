import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { db } from "@workspace/db";
import { trackedKeywordsTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { isSerpConfigured } from "@workspace/serp-provider";
import { requireProjectAccess } from "./project-access";

const createTrackedKeywordBody = z.object({
  websiteProjectId: z.number().int().positive(),
  keyword: z.string().min(1).max(200),
  targetUrl: z.string().url().optional(),
  location: z.string().min(1).optional(),
  language: z.string().min(2).max(10).optional(),
  device: z.enum(["desktop", "mobile"]).optional(),
});

export async function handleTrackedKeywordsWrite(
  request: Request,
  path: string,
  userId: number,
  trackJob: (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>,
): Promise<Response | null> {
  if (path === "/api/tracked-keywords" && request.method === "POST") {
    if (!isSerpConfigured()) {
      return withCors(
        request,
        Response.json(
          {
            error:
              "Rank tracking is not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
          },
          { status: 503 },
        ),
      );
    }

    const parsed = createTrackedKeywordBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    const access = await requireProjectAccess(parsed.data.websiteProjectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const [row] = await db
      .insert(trackedKeywordsTable)
      .values({
        websiteProjectId: parsed.data.websiteProjectId,
        keyword: parsed.data.keyword.trim().toLowerCase(),
        targetUrl: parsed.data.targetUrl ?? null,
        location: parsed.data.location ?? "United States",
        language: parsed.data.language ?? "en",
        device: parsed.data.device ?? "desktop",
      })
      .returning();

    const jobId = await sendToCfQueue(QUEUES.keywordRankCheck, { trackedKeywordId: row.id });
    const id = jobId ?? `cf:${QUEUES.keywordRankCheck}:${Date.now()}`;
    await trackJob(id, QUEUES.keywordRankCheck, {
      userId,
      projectId: parsed.data.websiteProjectId,
      trackedKeywordId: row.id,
    });

    return withCors(request, Response.json(row, { status: 201 }));
  }

  const deleteMatch = path.match(/^\/api\/tracked-keywords\/(\d+)$/);
  if (deleteMatch && request.method === "DELETE") {
    const id = Number.parseInt(deleteMatch[1]!, 10);
    const [kw] = await db
      .select()
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.id, id))
      .limit(1);
    if (!kw) {
      return withCors(request, Response.json({ error: "Tracked keyword not found" }, { status: 404 }));
    }

    const access = await requireProjectAccess(kw.websiteProjectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    await db
      .update(trackedKeywordsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(trackedKeywordsTable.id, id));

    return withCors(request, new Response(null, { status: 204 }));
  }

  return null;
}
