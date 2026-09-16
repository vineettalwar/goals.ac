import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentActionItemsTable, agentRunsTable, contentPiecesTable } from "@workspace/db/schema";
import type { AgentLoopPayload } from "@workspace/jobs/queues";
import { generateContentPiece } from "../content/content-studio-generator";
import { loadBrandContextForProject } from "../support/brand/brand-context-loader";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import { runAgentLoop } from "./loop";
import { createFirstPartyTools } from "./tools";
import { dbTrajectorySink, loadAgentRun } from "./persist";
import { detectLoopCredentials, loopMetaFromRun, hybridPlannerForUser } from "./generate-via-loop";
import { defaultEmployeePlanner } from "./planner";
import type { AgentGoal, AgentPolicy, AgentToolResult, RunAgentLoopResult, TrajectorySink } from "./types";

async function generateDraftForLoop(args: {
  projectId: number;
  userId?: number | null;
  keyword?: string;
}): Promise<AgentToolResult> {
  const keyword = args.keyword?.trim();
  if (!keyword) {
    return { ok: false, summary: "keyword required", error: "keyword required", evidenceRefs: [], hasToolEvidence: false };
  }
  const brand = await loadBrandContextForProject(args.projectId);
  if (!brand) {
    return { ok: false, summary: "Brand profile missing", error: "Brand profile missing", evidenceRefs: [], hasToolEvidence: false };
  }
  const userApiKey = args.userId ? await getDecryptedUserGeminiKey(args.userId) : null;
  const aiProviderOptions = args.userId ? await getUserAiProviderOptions(args.userId) : undefined;
  try {
    const generated = await generateContentPiece(
      "blog_post",
      brand,
      keyword,
      undefined,
      false,
      userApiKey,
      aiProviderOptions,
    );
    const [piece] = await db
      .insert(contentPiecesTable)
      .values({
        websiteProjectId: args.projectId,
        formatType: "blog_post",
        title: generated.title || keyword,
        targetKeyword: keyword,
        bodyMarkdown: generated.body_markdown,
        status: "draft",
        wordCount: generated.body_markdown.split(/\s+/).filter(Boolean).length,
        pieceMetadata: generated.pieceMetadata ?? null,
      })
      .returning({ id: contentPiecesTable.id });
    return {
      ok: true,
      summary: `Draft piece ${piece?.id ?? "?"}`,
      evidenceRefs: [],
      hasToolEvidence: false,
      data: { contentPieceId: piece?.id },
    };
  } catch (err) {
    return {
      ok: false,
      summary: err instanceof Error ? err.message : "Draft failed",
      error: err instanceof Error ? err.message : "Draft failed",
      evidenceRefs: [],
      hasToolEvidence: false,
    };
  }
}

export async function executeStoredAgentRun(input: {
  runId?: number;
  projectId: number;
  userId?: number | null;
  goal: AgentGoal;
  stepBudget?: number;
  actionItemId?: number;
  resumeApproved?: boolean;
  sink?: TrajectorySink;
  policy?: Partial<AgentPolicy>;
}): Promise<RunAgentLoopResult> {
  const credentials = await detectLoopCredentials(input.projectId);
  const sink = input.sink ?? dbTrajectorySink();
  const tools = createFirstPartyTools({
    generateDraft: (args) =>
      generateDraftForLoop({
        projectId: input.projectId,
        userId: input.userId,
        keyword: typeof args.keyword === "string" ? args.keyword : input.goal.keyword,
      }),
  });

  const prior = input.runId ? await loadAgentRun(input.runId) : null;
  const resume = Boolean(input.resumeApproved && prior);
  const policy = resume
    ? {
        allowLivePublish: true,
        approveFirstForLivePublish: false,
        plannerMode: "deterministic" as const,
        maxCredits: prior?.policy.maxCredits ?? 20,
      }
    : { allowLivePublish: false, approveFirstForLivePublish: true, plannerMode: "deterministic" as const, ...input.policy };

  const result = await runAgentLoop({
    runId: input.runId,
    goal: input.goal,
    tools,
    credentials,
    stepBudget: input.stepBudget ?? 10,
    policy,
    planner: policy.plannerMode === "hybrid" ? hybridPlannerForUser(input.userId) : defaultEmployeePlanner,
    sink,
    userId: input.userId,
    resumeFrom: resume && prior ? prior : undefined,
  });

  if (result.contentPieceId) {
    const [row] = await db
      .select({ pieceMetadata: contentPiecesTable.pieceMetadata })
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, result.contentPieceId))
      .limit(1);
    if (row) {
      await db
        .update(contentPiecesTable)
        .set({
          pieceMetadata: {
            ...(row.pieceMetadata ?? {}),
            ...loopMetaFromRun(result),
          },
        })
        .where(eq(contentPiecesTable.id, result.contentPieceId));
    }
  }

  if (input.actionItemId && result.id) {
    await db
      .update(agentActionItemsTable)
      .set({
        lastRunId: result.id,
        status:
          result.status === "completed"
            ? "done"
            : result.status === "no_evidence" || result.status === "failed" || result.status === "awaiting_approval"
              ? "blocked"
              : "running",
        updatedAt: new Date(),
      })
      .where(eq(agentActionItemsTable.id, input.actionItemId));
  }

  return result;
}

export async function executeAgentRunById(runId: number): Promise<RunAgentLoopResult> {
  const existing = await loadAgentRun(runId);
  if (!existing) throw new Error("Agent run not found");
  return executeStoredAgentRun({
    runId,
    projectId: existing.websiteProjectId,
    userId: existing.userId,
    goal: existing.goal,
  });
}

export async function startOpportunityScanRun(input: {
  projectId: number;
  userId: number;
}): Promise<{ runId: number; payload: AgentLoopPayload }> {
  const [run] = await db
    .insert(agentRunsTable)
    .values({
      websiteProjectId: input.projectId,
      userId: input.userId,
      goalKind: "opportunity_scan",
      goal: {
        kind: "opportunity_scan",
        text: "Score GSC and persist the action queue",
        projectId: input.projectId,
      },
      status: "running",
      policy: {
        allowLivePublish: false,
        approveFirstForLivePublish: true,
        plannerMode: "deterministic",
        maxCredits: 20,
      },
      trajectory: [],
    })
    .returning({ id: agentRunsTable.id });
  if (!run) throw new Error("Failed to create agent run");
  return {
    runId: run.id,
    payload: {
      projectId: input.projectId,
      userId: input.userId,
      runId: run.id,
      goalKind: "opportunity_scan",
      text: "Score GSC and persist the action queue",
    },
  };
}

export async function startExecuteActionRun(input: {
  projectId: number;
  userId: number;
  actionId: number;
}): Promise<{ runId: number; payload: AgentLoopPayload }> {
  const [action] = await db
    .select()
    .from(agentActionItemsTable)
    .where(eq(agentActionItemsTable.id, input.actionId))
    .limit(1);
  if (!action || action.websiteProjectId !== input.projectId) {
    throw new Error("Action not found");
  }
  const [run] = await db
    .insert(agentRunsTable)
    .values({
      websiteProjectId: input.projectId,
      userId: input.userId,
      goalKind: "execute_action",
      goal: {
        kind: "execute_action",
        text: action.title,
        projectId: input.projectId,
        keyword: action.keyword,
        actionItemId: action.id,
        actionType: action.actionType,
        targetUrl: action.url,
      },
      status: "running",
      policy: { allowLivePublish: false, approveFirstForLivePublish: true, plannerMode: "deterministic", maxCredits: 20 },
      trajectory: [],
    })
    .returning({ id: agentRunsTable.id });
  if (!run) throw new Error("Failed to create agent run");
  await db
    .update(agentActionItemsTable)
    .set({ status: "running", lastRunId: run.id, updatedAt: new Date() })
    .where(eq(agentActionItemsTable.id, input.actionId));
  return {
    runId: run.id,
    payload: {
      projectId: input.projectId,
      userId: input.userId,
      runId: run.id,
      actionItemId: input.actionId,
      goalKind: "execute_action",
      keyword: action.keyword,
      actionType: action.actionType,
      targetUrl: action.url ?? undefined,
      text: action.title,
    },
  };
}
