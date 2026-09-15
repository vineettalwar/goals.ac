import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { agentActionItemsTable, type AgentActionEffort, type AgentActionType } from "@workspace/db/schema";
import { getGscQueryRowsForProject, getGscSyncStatus } from "../analytics/gsc-search-analytics-service";
import { defaultSyncDateRange } from "@workspace/seo-tools/analyticsDateRange";
import { priorPeriodRange } from "@workspace/seo-tools/gscSearchAnalytics";
import { rollupGscQueries, scoreGscQueries, type GscScoredOpportunity } from "@workspace/seo-tools/gscOpportunityScorer";
import { listRefreshQueueItems } from "../strategy/refresh-queue-service";

export type ActionQueueEvidence = {
  source: string;
  detail: string;
  url?: string;
};

export type ScoredActionDraft = {
  fingerprint: string;
  actionType: AgentActionType;
  title: string;
  keyword: string;
  url: string | null;
  evidence: ActionQueueEvidence[];
  estimatedImpact: number;
  confidence: number;
  effort: AgentActionEffort;
  opportunityScore: number;
};

export function fingerprintAction(actionType: string, keyword: string, url?: string | null): string {
  return `${actionType}|${keyword.trim().toLowerCase()}|${(url ?? "").trim().toLowerCase()}`;
}

export function actionTypeFromGscPattern(pattern: GscScoredOpportunity["pattern"], hasPage: boolean): AgentActionType {
  if (pattern === "high_impressions_low_ctr") return "ctr_title";
  if (pattern === "page_mismatch") return "internal_link";
  if (pattern === "striking_distance" && hasPage) return "refresh";
  return "new_content";
}

export function draftsFromGsc(scored: GscScoredOpportunity[]): ScoredActionDraft[] {
  return scored.map((row) => {
    const actionType = actionTypeFromGscPattern(row.pattern, Boolean(row.topPage));
    const effort: AgentActionEffort = row.position <= 20 ? "low" : "medium";
    return {
      fingerprint: fingerprintAction(actionType, row.query, row.topPage),
      actionType,
      title: `${actionType.replaceAll("_", " ")}: ${row.query}`,
      keyword: row.query,
      url: row.topPage,
      evidence: [
        {
          source: "gsc_query",
          detail: `${row.pattern}; pos ${row.position.toFixed(1)}; ${row.impressions} imp; CTR ${(row.ctr * 100).toFixed(1)}%`,
          url: row.topPage ?? undefined,
        },
      ],
      estimatedImpact: Math.min(100, Math.round(row.impressions / 20 + row.opportunityScore)),
      confidence: row.opportunityScore,
      effort,
      opportunityScore: row.opportunityScore,
    };
  });
}

export function draftsFromRefreshQueue(
  items: Array<{
    id: string;
    kind: string;
    title: string;
    keyword: string;
    url: string | null;
    score: number;
    detail: string;
  }>,
): ScoredActionDraft[] {
  return items.map((item) => {
    const actionType: AgentActionType = item.kind === "ai_visibility_miss" ? "new_content" : "refresh";
    return {
      fingerprint: fingerprintAction(actionType, item.keyword, item.url),
      actionType,
      title: item.title,
      keyword: item.keyword,
      url: item.url,
      evidence: [{ source: item.kind, detail: item.detail, url: item.url ?? undefined }],
      estimatedImpact: Math.min(100, item.score),
      confidence: Math.min(100, item.score),
      effort: item.score >= 70 ? "medium" : "low",
      opportunityScore: Math.round(item.score),
    };
  });
}

export async function listActionQueueItems(projectId: number, status?: string) {
  const rows = await db
    .select()
    .from(agentActionItemsTable)
    .where(
      status
        ? and(eq(agentActionItemsTable.websiteProjectId, projectId), eq(agentActionItemsTable.status, status as never))
        : eq(agentActionItemsTable.websiteProjectId, projectId),
    )
    .orderBy(desc(agentActionItemsTable.opportunityScore))
    .limit(100);
  return rows;
}

export async function syncActionQueueFromSignals(projectId: number): Promise<{
  upserted: number;
  items: ScoredActionDraft[];
  gscConnected: boolean;
}> {
  const gsc = await getGscSyncStatus(projectId);
  const drafts: ScoredActionDraft[] = [];

  if (gsc.connected) {
    const dateRange = defaultSyncDateRange(28);
    const priorRange = priorPeriodRange(dateRange.startDate, dateRange.endDate);
    const [currentRows, priorRows] = await Promise.all([
      getGscQueryRowsForProject(projectId, dateRange.startDate, dateRange.endDate),
      getGscQueryRowsForProject(projectId, priorRange.startDate, priorRange.endDate),
    ]);
    const scored = scoreGscQueries(rollupGscQueries(currentRows), rollupGscQueries(priorRows));
    drafts.push(...draftsFromGsc(scored));
  }

  const refresh = await listRefreshQueueItems(projectId);
  drafts.push(...draftsFromRefreshQueue(refresh));

  const byFp = new Map<string, ScoredActionDraft>();
  for (const draft of drafts) {
    const existing = byFp.get(draft.fingerprint);
    if (!existing || draft.opportunityScore > existing.opportunityScore) byFp.set(draft.fingerprint, draft);
  }
  const items = [...byFp.values()].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 50);

  for (const item of items) {
    await db
      .insert(agentActionItemsTable)
      .values({
        websiteProjectId: projectId,
        fingerprint: item.fingerprint,
        actionType: item.actionType,
        title: item.title,
        keyword: item.keyword,
        url: item.url,
        evidence: item.evidence,
        estimatedImpact: item.estimatedImpact,
        confidence: item.confidence,
        effort: item.effort,
        opportunityScore: item.opportunityScore,
        status: "open",
      })
      .onConflictDoUpdate({
        target: [agentActionItemsTable.websiteProjectId, agentActionItemsTable.fingerprint],
        set: {
          title: item.title,
          evidence: item.evidence,
          estimatedImpact: item.estimatedImpact,
          confidence: item.confidence,
          effort: item.effort,
          opportunityScore: item.opportunityScore,
          url: item.url,
          updatedAt: new Date(),
        },
      });
  }

  return { upserted: items.length, items, gscConnected: gsc.connected };
}
