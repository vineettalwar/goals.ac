import { withCors } from "@workspace/cf-edge/cors";
import { inspectPublishedUrl } from "@workspace/content-engine/analytics/gsc-url-inspection-service";
import { wasRecentlyInspected } from "@workspace/content-engine/analytics/gsc-url-inspection-rate-limit";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { z } from "zod";
import { getAccessibleProject } from "./project-access";

const CreateBody = z.object({
  url: z.string().url(),
  contentPieceId: z.number().int().positive().optional(),
  publishRecordId: z.number().int().positive().optional(),
  async: z.boolean().optional().default(true),
});

export async function handleGscUrlInspectionWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/website-projects\/(\d+)\/gsc-url-inspections$/);
  if (!match || request.method !== "POST") return null;

  const projectId = Number.parseInt(match[1]!, 10);
  const project = await getAccessibleProject(projectId, userId);
  if (!project) {
    return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
  }

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return withCors(
      request,
      Response.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 },
      ),
    );
  }

  const { url: inspectionUrl, contentPieceId, publishRecordId } = parsed.data;

  if (await wasRecentlyInspected(projectId, inspectionUrl)) {
    return withCors(
      request,
      Response.json({ skipped: true, reason: "Inspected within the last 60 minutes" }),
    );
  }

  const runInline = async () => {
    const result = await inspectPublishedUrl({
      projectId,
      inspectionUrl,
      contentPieceId,
      publishRecordId,
    });
    return withCors(request, Response.json(result, { status: 201 }));
  };

  if (!parsed.data.async) {
    try {
      return await runInline();
    } catch (err) {
      return withCors(
        request,
        Response.json(
          { error: err instanceof Error ? err.message : "Inspection failed" },
          { status: 502 },
        ),
      );
    }
  }

  try {
    await sendToCfQueue(QUEUES.gscUrlInspection, {
      projectId,
      inspectionUrl,
      contentPieceId,
      publishRecordId,
    });
    return withCors(request, Response.json({ queued: true }, { status: 202 }));
  } catch {
    try {
      return await runInline();
    } catch (inlineErr) {
      return withCors(
        request,
        Response.json(
          {
            error:
              inlineErr instanceof Error ? inlineErr.message : "Failed to queue inspection",
          },
          { status: 502 },
        ),
      );
    }
  }
}
