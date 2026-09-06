import { withCors } from "@workspace/cf-edge/cors";
import { acceptedJobResponse } from "@workspace/cf-edge/enqueue-http";
import { db } from "./db";
import {
  contentItemsTable,
  contentStrategiesTable,
  usersTable,
} from "@workspace/db/schema-sqlite";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { sendToCfQueue } from "@workspace/jobs/cf-queues";
import { QUEUES } from "@workspace/jobs/queues";
import { isPlatformAdmin } from "@workspace/platform-admin";
import {
  parseAutopilotSettings,
  shouldAutoPublish,
} from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { getAccessibleProject, requireProjectAccess } from "./project-access";

const updateItemStatusBody = z.object({
  status: z.enum(["draft", "prepared", "published"]),
});

async function assertStrategyAccess(
  strategyId: number,
  userId: number,
): Promise<
  | { error: "not_found" }
  | { error: "forbidden" }
  | { strategy: typeof contentStrategiesTable.$inferSelect }
> {
  const [strategy] = await db
    .select()
    .from(contentStrategiesTable)
    .where(eq(contentStrategiesTable.id, strategyId))
    .limit(1);

  if (!strategy) return { error: "not_found" };

  if (strategy.websiteProjectId) {
    const access = await requireProjectAccess(strategy.websiteProjectId, userId);
    if (!access.ok) return { error: "forbidden" };
  } else {
    const [user] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!isPlatformAdmin(user?.role)) return { error: "forbidden" };
  }

  return { strategy };
}

export async function handleContentStrategiesWrite(
  request: Request,
  path: string,
  userId: number,
  trackJob: (jobId: string, queue: string, meta: Record<string, unknown>) => Promise<void>,
): Promise<Response | null> {
  const directItemMatch = path.match(/^\/api\/content-items\/(\d+)$/);
  if (directItemMatch && request.method === "PATCH") {
    const itemId = Number.parseInt(directItemMatch[1]!, 10);
    const parsed = updateItemStatusBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    const [item] = await db
      .select()
      .from(contentItemsTable)
      .where(eq(contentItemsTable.id, itemId))
      .limit(1);
    if (!item) {
      return withCors(request, Response.json({ error: "Content item not found" }, { status: 404 }));
    }

    const access = await assertStrategyAccess(item.strategyId, userId);
    if ("error" in access && access.error === "not_found") {
      return withCors(request, Response.json({ error: "Content strategy not found" }, { status: 404 }));
    }
    if ("error" in access && access.error === "forbidden") {
      return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
    }

    const [updated] = await db
      .update(contentItemsTable)
      .set({ status: parsed.data.status })
      .where(eq(contentItemsTable.id, itemId))
      .returning();

    return withCors(request, Response.json(updated));
  }

  const itemMatch = path.match(/^\/api\/content-strategies\/(\d+)\/items\/(\d+)$/);
  if (itemMatch && request.method === "PATCH") {
    const strategyId = Number.parseInt(itemMatch[1]!, 10);
    const itemId = Number.parseInt(itemMatch[2]!, 10);

    const parsed = updateItemStatusBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json(
          { error: parsed.error.errors[0]?.message ?? "Invalid request" },
          { status: 400 },
        ),
      );
    }

    const access = await assertStrategyAccess(strategyId, userId);
    if ("error" in access && access.error === "not_found") {
      return withCors(request, Response.json({ error: "Content strategy not found" }, { status: 404 }));
    }
    if ("error" in access && access.error === "forbidden") {
      return withCors(request, Response.json({ error: "Access denied" }, { status: 403 }));
    }

    const [item] = await db
      .select()
      .from(contentItemsTable)
      .where(and(eq(contentItemsTable.id, itemId), eq(contentItemsTable.strategyId, strategyId)))
      .limit(1);
    if (!item) {
      return withCors(request, Response.json({ error: "Content item not found" }, { status: 404 }));
    }

    const [updated] = await db
      .update(contentItemsTable)
      .set({ status: parsed.data.status })
      .where(eq(contentItemsTable.id, itemId))
      .returning();

    return withCors(request, Response.json(updated));
  }

  const generateMatch = path.match(
    /^\/api\/content-strategies\/(\d+)\/items\/(\d+)\/generate$/,
  );
  if (generateMatch && request.method === "POST") {
    const strategyId = Number.parseInt(generateMatch[1]!, 10);
    const itemId = Number.parseInt(generateMatch[2]!, 10);

    const [strategy] = await db
      .select()
      .from(contentStrategiesTable)
      .where(eq(contentStrategiesTable.id, strategyId))
      .limit(1);
    if (!strategy) {
      return withCors(request, Response.json({ error: "Content strategy not found" }, { status: 404 }));
    }
    if (!strategy.websiteProjectId) {
      return withCors(
        request,
        Response.json({ error: "Strategy is not linked to a project" }, { status: 400 }),
      );
    }

    const access = await requireProjectAccess(strategy.websiteProjectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const body = await request.json().catch(() => ({}));
    const generateVariants = (body as { generateVariants?: boolean }).generateVariants !== false;

    const jobId = await sendToCfQueue(QUEUES.contentGenerate, {
      contentItemId: itemId,
      projectId: strategy.websiteProjectId,
      userId,
      generateVariants,
    });
    const id = jobId ?? `cf:${QUEUES.contentGenerate}:${Date.now()}`;
    await trackJob(id, QUEUES.contentGenerate, {
      userId,
      projectId: strategy.websiteProjectId,
      contentItemId: itemId,
    });

    return withCors(
      request,
      acceptedJobResponse(id, QUEUES.contentGenerate, {
        contentItemId: itemId,
        queued: true,
      }),
    );
  }

  const scheduleMatch = path.match(
    /^\/api\/content-strategies\/(\d+)\/items\/(\d+)\/schedule$/,
  );
  if (scheduleMatch && request.method === "POST") {
    const strategyId = Number.parseInt(scheduleMatch[1]!, 10);
    const itemId = Number.parseInt(scheduleMatch[2]!, 10);

    const [strategy] = await db
      .select()
      .from(contentStrategiesTable)
      .where(eq(contentStrategiesTable.id, strategyId))
      .limit(1);
    if (!strategy?.websiteProjectId) {
      return withCors(
        request,
        Response.json({ error: "Strategy is not linked to a project" }, { status: 400 }),
      );
    }

    const project = await getAccessibleProject(strategy.websiteProjectId, userId);
    if (!project) {
      return withCors(request, Response.json({ error: "Project not found" }, { status: 404 }));
    }

    const settings = parseAutopilotSettings(project.autopilotSettings);
    const schedulePublish = shouldAutoPublish(settings);

    const jobId = await sendToCfQueue(QUEUES.contentGenerate, {
      contentItemId: itemId,
      projectId: strategy.websiteProjectId,
      userId,
      generateVariants: true,
      schedulePublish,
    });
    const id = jobId ?? `cf:${QUEUES.contentGenerate}:${Date.now()}`;
    await trackJob(id, QUEUES.contentGenerate, {
      userId,
      projectId: strategy.websiteProjectId,
      contentItemId: itemId,
      schedulePublish,
    });

    return withCors(
      request,
      Response.json({ queued: true, contentItemId: itemId }, { status: 202 }),
    );
  }

  return null;
}
