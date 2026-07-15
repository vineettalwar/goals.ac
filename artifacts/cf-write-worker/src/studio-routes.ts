import { db } from "@workspace/db";
import { briefsTable, goalsTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { withCors } from "@workspace/cf-edge/cors";
import { compileBriefsFromGoal } from "@workspace/content-engine/strategy/goal-brief-compiler";
import { getDecryptedUserGeminiKey } from "@workspace/content-engine/support/ai/user-api-key";
import { getUserAiProviderOptions } from "@workspace/content-engine/support/ai/user-ai-provider";
import { z } from "zod";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "./ai-billing";
import { requireProjectAccess } from "./project-access";

const OBJECTIVES = ["traffic", "leads", "sales", "authority"] as const;
const STATUSES = ["draft", "active", "achieved", "archived"] as const;

const createGoalBody = z.object({
  projectId: z.number().int().positive(),
  objective: z.enum(OBJECTIVES),
  targetMetric: z.string().min(1),
  baseline: z.string().optional(),
  deadline: z.coerce.date().optional(),
  icp: z.string().optional(),
  priority: z.number().int().optional(),
  status: z.enum(STATUSES).optional(),
});

const patchGoalBody = createGoalBody.partial().omit({ projectId: true });

const createBriefBody = z.object({
  goalId: z.number().int().positive(),
  title: z.string().min(1).optional(),
  workingTitle: z.string().min(1).optional(),
  targetKeywordCluster: z.string().optional(),
  angle: z.string().optional(),
  status: z.string().optional(),
});

export async function handleStudioWrite(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const method = request.method;

  if (path === "/api/goals" && method === "POST") {
    const body = await request.json().catch(() => null);
    const parsed = createGoalBody.safeParse(body);
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }
    const access = await requireProjectAccess(parsed.data.projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const [goal] = await db
      .insert(goalsTable)
      .values({
        projectId: parsed.data.projectId,
        objective: parsed.data.objective,
        targetMetric: parsed.data.targetMetric,
        baseline: parsed.data.baseline,
        deadline: parsed.data.deadline,
        icp: parsed.data.icp,
        priority: parsed.data.priority ?? 0,
        status: parsed.data.status ?? "draft",
      })
      .returning();
    return withCors(request, Response.json(goal, { status: 201 }));
  }

  const goalMatch = path.match(/^\/api\/goals\/(\d+)$/);
  if (goalMatch && method === "PATCH") {
    const goalId = Number.parseInt(goalMatch[1]!, 10);
    const [existing] = await db.select().from(goalsTable).where(eq(goalsTable.id, goalId)).limit(1);
    if (!existing) return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    const access = await requireProjectAccess(existing.projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const body = await request.json().catch(() => null);
    const parsed = patchGoalBody.safeParse(body);
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }
    const [goal] = await db
      .update(goalsTable)
      .set(parsed.data)
      .where(eq(goalsTable.id, goalId))
      .returning();
    return withCors(request, Response.json(goal));
  }

  if (goalMatch && method === "DELETE") {
    const goalId = Number.parseInt(goalMatch[1]!, 10);
    const [existing] = await db.select().from(goalsTable).where(eq(goalsTable.id, goalId)).limit(1);
    if (!existing) return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    const access = await requireProjectAccess(existing.projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    await db.delete(goalsTable).where(eq(goalsTable.id, goalId));
    return withCors(request, Response.json({ ok: true }));
  }

  const compileMatch = path.match(/^\/api\/goals\/(\d+)\/compile-briefs$/);
  if (compileMatch && method === "POST") {
    const goalId = Number.parseInt(compileMatch[1]!, 10);
    const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, goalId)).limit(1);
    if (!goal) return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    const access = await requireProjectAccess(goal.projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }

    const billingPrep = await prepareAiBilling({
      userId,
      tier: "planning",
      quotaKind: "article",
      companyId: goal.projectId,
    });
    if (!billingPrep.ok) return withCors(request, billingPrep.response);

    try {
      const [userApiKey, aiProviderOptions] = await Promise.all([
        getDecryptedUserGeminiKey(userId),
        getUserAiProviderOptions(userId),
      ]);
      const { briefs: compiledBriefs, generationUsage } = await compileBriefsFromGoal(goal, {
        projectId: goal.projectId,
        userId,
        userApiKey,
        aiProviderOptions,
      });

      const inserted = await db
        .insert(briefsTable)
        .values(
          compiledBriefs.map((draft) => ({
            goalId: goal.id,
            workingTitle: draft.workingTitle,
            targetKeywordCluster: draft.targetKeywordCluster,
            searchIntent: draft.searchIntent,
            funnelStage: draft.funnelStage,
            angle: draft.angle,
            format: draft.format,
            wordCount: draft.wordCount,
            successMetric: draft.successMetric,
            status: "draft",
          })),
        )
        .returning();

      await completeAiBilling(billingPrep.ctx, {
        userId,
        eventType: "brief_compilation",
        usedByok: billingPrep.usedByok,
        tier: "planning",
        companyId: goal.projectId,
        promptTokens: generationUsage?.promptTokens,
        outputTokens: generationUsage?.outputTokens,
        totalTokens: generationUsage?.totalTokens,
      });

      return withCors(request, Response.json({ briefs: inserted }, { status: 201 }));
    } catch (err) {
      await cancelAiBilling(billingPrep.ctx);
      throw err;
    }
  }

  if (path === "/api/briefs" && method === "POST") {
    const body = await request.json().catch(() => null);
    const parsed = createBriefBody.safeParse(body);
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid request" }, { status: 400 }));
    }
    const [goal] = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.id, parsed.data.goalId))
      .limit(1);
    if (!goal) return withCors(request, Response.json({ error: "Goal not found" }, { status: 404 }));
    const access = await requireProjectAccess(goal.projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const [brief] = await db
      .insert(briefsTable)
      .values({
        goalId: parsed.data.goalId,
        workingTitle: parsed.data.workingTitle ?? parsed.data.title ?? "Untitled brief",
        targetKeywordCluster: parsed.data.targetKeywordCluster,
        angle: parsed.data.angle,
        status: parsed.data.status ?? "draft",
      })
      .returning();
    return withCors(request, Response.json(brief, { status: 201 }));
  }

  const briefMatch = path.match(/^\/api\/briefs\/(\d+)$/);
  if (briefMatch && method === "PATCH") {
    const briefId = Number.parseInt(briefMatch[1]!, 10);
    const [existing] = await db.select().from(briefsTable).where(eq(briefsTable.id, briefId)).limit(1);
    if (!existing) return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    const [goal] = await db
      .select()
      .from(goalsTable)
      .where(eq(goalsTable.id, existing.goalId))
      .limit(1);
    if (!goal) return withCors(request, Response.json({ error: "Not found" }, { status: 404 }));
    const access = await requireProjectAccess(goal.projectId, userId);
    if (!access.ok) {
      return withCors(request, Response.json({ error: access.error }, { status: access.status }));
    }
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const [brief] = await db
      .update(briefsTable)
      .set(body ?? {})
      .where(eq(briefsTable.id, briefId))
      .returning();
    return withCors(request, Response.json(brief));
  }

  return null;
}
