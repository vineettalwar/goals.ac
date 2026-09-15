import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  agentActionItemsTable,
  competitorAnalysesTable,
  contentPiecesTable,
  keywordOpportunitiesTable,
  trackedKeywordsTable,
} from "@workspace/db/schema";
import { getGscSyncStatus } from "../analytics/gsc-search-analytics-service";
import { loadBrandContextForProject } from "../support/brand/brand-context-loader";
import { generateContentPiece } from "../content/content-studio-generator";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import { isBacklinksConfigured } from "@workspace/serp-provider";
import { runAgentLoop } from "./loop";
import { createFirstPartyTools } from "./tools";
import { dbTrajectorySink, loadAgentRun } from "./persist";
import type { AgentGoal, AgentLoopCredentials, AgentToolResult, RunAgentLoopResult } from "./types";

async function detectCredentials(projectId: number): Promise<AgentLoopCredentials> {
  const [gsc, opp, tracked, competitors] = await Promise.all([
    getGscSyncStatus(projectId),
    db
      .select({ id: keywordOpportunitiesTable.id })
      .from(keywordOpportunitiesTable)
      .where(eq(keywordOpportunitiesTable.websiteProjectId, projectId))
      .limit(1),
    db
      .select({ id: trackedKeywordsTable.id })
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.websiteProjectId, projectId))
      .limit(1),
    db
      .select({ id: competitorAnalysesTable.id })
      .from(competitorAnalysesTable)
      .where(eq(competitorAnalysesTable.websiteProjectId, projectId))
      .limit(1),
  ]);
  return {
    gsc: gsc.connected,
    keywords: opp.length > 0 || tracked.length > 0,
    competitors: competitors.length > 0,
    serp: isBacklinksConfigured(),
  };
}

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
}): Promise<RunAgentLoopResult> {
  const credentials = await detectCredentials(input.projectId);
  const sink = dbTrajectorySink();
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
    sink,
    userId: input.userId,
  });

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
