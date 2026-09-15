import { eq } from "drizzle-orm";
import { z } from "zod";
import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { db } from "./db";
import { agentActionItemsTable, agentRunsTable } from "@workspace/db/schema-sqlite";
import { getAccessibleProject } from "./project-access";
import type { TrackJob } from "./content-pieces-shared";

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
    const [run] = await db
      .insert(agentRunsTable)
      .values({
        websiteProjectId: projectId,
        userId,
        goalKind: "opportunity_scan",
        goal: { kind: "opportunity_scan", text: "Score GSC and persist the action queue", projectId },
        status: "running",
        policy: { allowLivePublish: false, approveFirstForLivePublish: true, maxCredits: 20 },
        trajectory: [],
      })
      .returning({ id: agentRunsTable.id });
    const jobId = await sendToCfQueue(QUEUES.agentLoop, {
      projectId,
      userId,
      runId: run?.id,
      goalKind: "opportunity_scan",
    });
    if (jobId && trackJob) {
      await trackJob(jobId, QUEUES.agentLoop, { userId, projectId, runId: run?.id });
    }
    return withCors(
      request,
      acceptedJobResponse(jobId ?? `cf:${QUEUES.agentLoop}:${Date.now()}`, QUEUES.agentLoop, { runId: run?.id }),
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
    const [action] = await db
      .select()
      .from(agentActionItemsTable)
      .where(eq(agentActionItemsTable.id, actionId))
      .limit(1);
    if (!action || action.websiteProjectId !== projectId) {
      return withCors(request, Response.json({ error: "Action not found" }, { status: 404 }));
    }
    const [run] = await db
      .insert(agentRunsTable)
      .values({
        websiteProjectId: projectId,
        userId,
        goalKind: "execute_action",
        goal: {
          kind: "execute_action",
          text: action.title,
          projectId,
          keyword: action.keyword,
          actionItemId: action.id,
          actionType: action.actionType,
          targetUrl: action.url,
        },
        status: "running",
        policy: { allowLivePublish: false, approveFirstForLivePublish: true, maxCredits: 20 },
        trajectory: [],
      })
      .returning({ id: agentRunsTable.id });
    await db
      .update(agentActionItemsTable)
      .set({ status: "running", lastRunId: run?.id ?? null, updatedAt: new Date() })
      .where(eq(agentActionItemsTable.id, actionId));
    const jobId = await sendToCfQueue(QUEUES.agentLoop, {
      projectId,
      userId,
      runId: run?.id,
      actionItemId: actionId,
      goalKind: "execute_action",
      keyword: action.keyword,
      actionType: action.actionType,
      targetUrl: action.url ?? undefined,
      text: action.title,
    });
    if (jobId && trackJob) {
      await trackJob(jobId, QUEUES.agentLoop, { userId, projectId, runId: run?.id, actionItemId: actionId });
    }
    return withCors(
      request,
      acceptedJobResponse(jobId ?? `cf:${QUEUES.agentLoop}:${Date.now()}`, QUEUES.agentLoop, {
        runId: run?.id,
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
