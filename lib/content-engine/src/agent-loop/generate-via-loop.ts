import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  competitorAnalysesTable,
  keywordOpportunitiesTable,
  trackedKeywordsTable,
} from "@workspace/db/schema";
import { getGscSyncStatus } from "../analytics/gsc-search-analytics-service";
import { loadBrandContextForProject } from "../support/brand/brand-context-loader";
import {
  generateContentPiece,
  generateContentPieceStream,
  type BrandContext,
  type ContentGenerationContext,
  type ContentPieceResult,
} from "../content/content-studio-generator";
import { getDecryptedUserGeminiKey } from "../support/ai/user-api-key";
import { getUserAiProviderOptions } from "../support/ai/user-ai-provider";
import { isBacklinksConfigured } from "@workspace/serp-provider";
import type { ContentFormatType } from "@workspace/db";
import type { ContentPieceMetadata } from "../content/content-piece-seo";
import { resolveAiClientForUser } from "../support/ai/resolve-ai-client-for-user";
import { modelForProviderTier } from "@workspace/ai-providers";
import { runAgentLoop } from "./loop";
import { createFirstPartyTools } from "./tools";
import { defaultEmployeePlanner } from "./planner";
import { buildPlannerChoicePrompt, createHybridPlanner, parsePlannerJson } from "./hybrid-planner";
import { dbTrajectorySink } from "./persist";
import {
  trajectoryHasVerifiedEvidence,
  type AgentLoopCredentials,
  type AgentToolResult,
  type RunAgentLoopResult,
  type TrajectorySink,
} from "./types";

/** Interactive Studio (SSE / job from the editor). */
export const STUDIO_AGENT_LOOP_CAPS = { stepBudget: 10, maxCredits: 16 } as const;
/** Autopilot + Daily Five. Live publish still gated by default policy. */
export const UNATTENDED_AGENT_LOOP_CAPS = { stepBudget: 6, maxCredits: 12 } as const;

export async function detectLoopCredentials(projectId: number): Promise<AgentLoopCredentials> {
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

export function loopMetaFromRun(run: RunAgentLoopResult): Pick<
  ContentPieceMetadata,
  "researchConnected" | "researchNote"
> & { agentRunId?: number; generatedViaAgentLoop: true } {
  const researchConnected = trajectoryHasVerifiedEvidence(run.trajectory);
  return {
    generatedViaAgentLoop: true,
    ...(run.id ? { agentRunId: run.id } : {}),
    researchConnected,
    researchNote: researchConnected
      ? undefined
      : "Research tools ran; no verified GSC/keyword/competitor rows. Claims are not marked verified.",
  };
}

export async function runResearchThenDraftLoop(input: {
  projectId: number;
  userId?: number | null;
  keyword: string;
  contentPieceId?: number;
  caps?: { stepBudget: number; maxCredits: number };
  generateDraft: (args: Record<string, unknown>) => Promise<AgentToolResult>;
  sink?: TrajectorySink;
  onPersist?: (run: RunAgentLoopResult) => void;
  /** Autopilot/Daily Five: deterministic. Studio default: hybrid LLM+fallback. */
  plannerMode?: "deterministic" | "hybrid";
}): Promise<RunAgentLoopResult> {
  const caps = input.caps ?? STUDIO_AGENT_LOOP_CAPS;
  const credentials = await detectLoopCredentials(input.projectId);
  const inner = input.sink ?? dbTrajectorySink();
  const sink: TrajectorySink = {
    async save(run) {
      await inner.save(run);
      input.onPersist?.(run);
    },
  };
  const plannerMode = input.plannerMode ?? "hybrid";
  const planner =
    plannerMode === "deterministic"
      ? defaultEmployeePlanner
      : createHybridPlanner({
          choose: async (ctx, tools) => {
            if (!input.userId) return null;
            try {
              const resolved = await resolveAiClientForUser(input.userId);
              const prompt = buildPlannerChoicePrompt(ctx, tools);
              const model = modelForProviderTier(resolved.providerId, "rapid");
              const out = await resolved.client.generate({
                prompt,
                temperature: 0,
                maxOutputTokens: 280,
                ...(model ? { model } : {}),
              });
              return parsePlannerJson(out.text, tools.map((tool) => tool.name));
            } catch {
              return null;
            }
          },
        });
  return runAgentLoop({
    goal: {
      kind: "research_then_draft",
      text: `Draft for ${input.keyword}`,
      projectId: input.projectId,
      keyword: input.keyword,
      contentPieceId: input.contentPieceId,
    },
    tools: createFirstPartyTools({ generateDraft: input.generateDraft }),
    credentials,
    stepBudget: caps.stepBudget,
    policy: {
      allowLivePublish: false,
      approveFirstForLivePublish: true,
      maxCredits: caps.maxCredits,
      plannerMode,
    },
    planner,
    sink,
    userId: input.userId,
  });
}

export async function studioDraftFromKeyword(input: {
  projectId: number;
  userId?: number | null;
  format: ContentFormatType;
  keyword: string;
  angleHint?: string;
  bypassCache?: boolean;
  userApiKey?: string | null;
  aiProviderOptions?: Awaited<ReturnType<typeof getUserAiProviderOptions>>;
  generationContext?: ContentGenerationContext;
  streamChunk?: (chunk: string) => void;
  brand?: BrandContext | null;
}): Promise<{ tool: AgentToolResult; generated?: ContentPieceResult }> {
  const keyword = input.keyword.trim();
  if (!keyword) {
    return {
      tool: { ok: false, summary: "keyword required", error: "keyword required", evidenceRefs: [], hasToolEvidence: false },
    };
  }
  const brand = input.brand ?? (await loadBrandContextForProject(input.projectId));
  if (!brand) {
    return {
      tool: { ok: false, summary: "Brand profile missing", error: "Brand profile missing", evidenceRefs: [], hasToolEvidence: false },
    };
  }
  const userApiKey =
    input.userApiKey !== undefined
      ? input.userApiKey
      : input.userId
        ? await getDecryptedUserGeminiKey(input.userId)
        : null;
  const aiProviderOptions =
    input.aiProviderOptions ?? (input.userId ? await getUserAiProviderOptions(input.userId) : undefined);
  try {
    const generated = input.streamChunk
      ? await generateContentPieceStream(
          input.format,
          brand,
          keyword,
          input.streamChunk,
          input.angleHint,
          userApiKey,
          aiProviderOptions,
          input.generationContext ?? {},
        )
      : await generateContentPiece(
          input.format,
          brand,
          keyword,
          input.angleHint,
          input.bypassCache ?? true,
          userApiKey,
          aiProviderOptions,
          input.generationContext ?? {},
        );
    return {
      generated,
      tool: {
        ok: true,
        summary: `Drafted “${generated.title || keyword}”`,
        evidenceRefs: [],
        hasToolEvidence: false,
        data: { title: generated.title },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Draft failed";
    return {
      tool: { ok: false, summary: message, error: message, evidenceRefs: [], hasToolEvidence: false },
    };
  }
}
