import { eq } from "drizzle-orm";
import { z } from "zod";
import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { db } from "./db";
import { agentActionItemsTable } from "@workspace/db/schema-sqlite";
import { getAccessibleProject } from "./project-access";
import type { TrackJob } from "./content-pieces-shared";
import {
  approveActionQueueItem,
  startExecuteActionRun,
  startOpportunityScanRun,
} from "@workspace/content-engine/agent-loop";

const PatchActionBody = z.object({
  status: z.enum(["open", "approved", "dismissed", "blocked"]),
});

export async function handleAgentLoopWrite(
  request: Request,
  path: string,
  userId: number,
  trackJob?: TrackJob,
): Promise<Response | null> {
  const method = request.method;

  const syncMatch = path.match(/^\/api\/website-projects\/(\d+)\/agent-actions\/sync$/);
  if (syncMatch && method === "POST") {
    const projectId = Number.parseInt(syncMatch[1]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    let started: Awaited<ReturnType<typeof startOpportunityScanRun>>;
    try {
      started = await startOpportunityScanRun({ projectId, userId });
    } catch {
      return withCors(request, Response.json({ error: "Could not start scan" }, { status: 500 }));
    }
    const jobId = await sendToCfQueue(QUEUES.agentLoop, started.payload);
    if (jobId && trackJob) {
      await trackJob(jobId, QUEUES.agentLoop, { userId, projectId, runId: started.runId });
    }
    return withCors(
      request,
      acceptedJobResponse(jobId ?? `cf:${QUEUES.agentLoop}:${Date.now()}`, QUEUES.agentLoop, { runId: started.runId }),
    );
  }

  const runActionMatch = path.match(/^\/api\/website-projects\/(\d+)\/agent-actions\/(\d+)\/run$/);
  if (runActionMatch && method === "POST") {
    const projectId = Number.parseInt(runActionMatch[1]!, 10);
    const actionId = Number.parseInt(runActionMatch[2]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    let started: Awaited<ReturnType<typeof startExecuteActionRun>>;
    try {
      started = await startExecuteActionRun({ projectId, userId, actionId });
    } catch {
      return withCors(request, Response.json({ error: "Action not found" }, { status: 404 }));
    }
    const jobId = await sendToCfQueue(QUEUES.agentLoop, started.payload);
    if (jobId && trackJob) {
      await trackJob(jobId, QUEUES.agentLoop, { userId, projectId, runId: started.runId, actionItemId: actionId });
    }
    return withCors(
      request,
      acceptedJobResponse(jobId ?? `cf:${QUEUES.agentLoop}:${Date.now()}`, QUEUES.agentLoop, {
        runId: started.runId,
        actionId,
      }),
    );
  }

  const patchMatch = path.match(/^\/api\/website-projects\/(\d+)\/agent-actions\/(\d+)$/);
  if (patchMatch && method === "PATCH") {
    const projectId = Number.parseInt(patchMatch[1]!, 10);
    const actionId = Number.parseInt(patchMatch[2]!, 10);
    const project = await getAccessibleProject(projectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }
    const parsed = PatchActionBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid body" }, { status: 400 }));
    }
    if (parsed.data.status === "approved") {
      try {
        const result = await approveActionQueueItem({ projectId, actionId, userId });
        if (result.resumePayload) {
          const jobId = await sendToCfQueue(QUEUES.agentLoop, result.resumePayload);
          if (jobId && trackJob) {
            await trackJob(jobId, QUEUES.agentLoop, { userId, projectId, runId: result.runId, actionItemId: actionId });
          }
        }
        const [item] = await db
          .select()
          .from(agentActionItemsTable)
          .where(eq(agentActionItemsTable.id, actionId))
          .limit(1);
        return withCors(request, Response.json({ item, approval: result.status, runId: result.runId }));
      } catch {
        return withCors(request, Response.json({ error: "Action not found" }, { status: 404 }));
      }
    }
    const [existing] = await db
      .select({ id: agentActionItemsTable.id, websiteProjectId: agentActionItemsTable.websiteProjectId })
      .from(agentActionItemsTable)
      .where(eq(agentActionItemsTable.id, actionId))
      .limit(1);
    if (!existing || existing.websiteProjectId !== projectId) {
      return withCors(request, Response.json({ error: "Action not found" }, { status: 404 }));
    }
    const [updated] = await db
      .update(agentActionItemsTable)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(agentActionItemsTable.id, actionId))
      .returning();
    return withCors(request, Response.json({ item: updated }));
  }

  return null;
}
