import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentActionItemsTable, contentPiecesTable } from "@workspace/db/schema";
import { generateContentPiece } from "../content/content-studio-generator";
import { loadBrandContextForProject } from "../support/brand/brand-context-loader";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import { runAgentLoop } from "./loop";
import { createFirstPartyTools } from "./tools";
import { dbTrajectorySink, loadAgentRun } from "./persist";
import { detectLoopCredentials, loopMetaFromRun } from "./generate-via-loop";
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

  const result = await runAgentLoop({
    runId: input.runId,
    goal: input.goal,
    tools,
    credentials,
    stepBudget: input.stepBudget ?? 10,
    policy: { allowLivePublish: false, approveFirstForLivePublish: true, ...input.policy },
    sink,
    userId: input.userId,
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
