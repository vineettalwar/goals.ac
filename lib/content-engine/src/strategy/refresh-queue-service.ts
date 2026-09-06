import { db } from "@workspace/db";
import {
  keywordOpportunitiesTable,
  keywordRankAlertsTable,
  llmVisibilitySnapshotsTable,
} from "@workspace/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

export type RefreshQueueItem = {
  id: string;
  kind: "content_refresh" | "rank_drop" | "rank_alert" | "ai_visibility_miss";
  title: string;
  keyword: string;
  url: string | null;
  score: number;
  detail: string;
  createdAt: string | null;
};

function scoreFromOpp(score: number | null | undefined): number {
  return typeof score === "number" && Number.isFinite(score) ? score : 0;
}

/**
 * Join existing decay / rank / AI-visibility signals into one prioritized list.
 * Read-only — does not run discovery; callers use existing sweeps.
 */
export async function listRefreshQueueItems(projectId: number): Promise<RefreshQueueItem[]> {
  const [opportunities, alerts, visibility] = await Promise.all([
    db
      .select()
      .from(keywordOpportunitiesTable)
      .where(
        and(
          eq(keywordOpportunitiesTable.websiteProjectId, projectId),
          eq(keywordOpportunitiesTable.status, "open"),
          inArray(keywordOpportunitiesTable.source, ["content_refresh", "rank_drop"]),
        ),
      )
      .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
      .limit(50),
    db
      .select()
      .from(keywordRankAlertsTable)
      .where(
        and(
          eq(keywordRankAlertsTable.websiteProjectId, projectId),
          eq(keywordRankAlertsTable.status, "open"),
        ),
      )
      .orderBy(desc(keywordRankAlertsTable.createdAt))
      .limit(30),
    db
      .select()
      .from(llmVisibilitySnapshotsTable)
      .where(eq(llmVisibilitySnapshotsTable.websiteProjectId, projectId))
      .orderBy(desc(llmVisibilitySnapshotsTable.checkedAt))
      .limit(40),
  ]);

  const items: RefreshQueueItem[] = [];

  for (const opp of opportunities) {
    const kind = opp.source === "rank_drop" ? "rank_drop" : "content_refresh";
    items.push({
      id: `opp-${opp.id}`,
      kind,
      title: opp.suggestedTitle || `Refresh: ${opp.keyword}`,
      keyword: opp.keyword,
      url: opp.competitorUrl ?? null,
      score: scoreFromOpp(opp.opportunityScore),
      detail: opp.suggestedAngle ?? (kind === "rank_drop" ? "Rank dropped" : "Traffic decay"),
      createdAt: opp.createdAt?.toISOString?.() ?? null,
    });
  }

  for (const alert of alerts) {
    items.push({
      id: `alert-${alert.id}`,
      kind: "rank_alert",
      title: `Rank alert: ${alert.keyword}`,
      keyword: alert.keyword,
      url: null,
      score: Math.min(100, 40 + Math.abs(alert.changeAmount ?? 0) * 5),
      detail: `Moved ${alert.previousPosition ?? "?"} → ${alert.currentPosition ?? "?"} (${alert.severity})`,
      createdAt: alert.createdAt?.toISOString?.() ?? null,
    });
  }

  const seenPrompt = new Set<string>();
  for (const snap of visibility) {
    if (snap.cited) continue;
    const key = `${snap.prompt}|${snap.engine}`;
    if (seenPrompt.has(key)) continue;
    seenPrompt.add(key);
    items.push({
      id: `vis-${snap.id}`,
      kind: "ai_visibility_miss",
      title: `AI miss: ${snap.prompt.slice(0, 80)}`,
      keyword: snap.prompt.slice(0, 120),
      url: null,
      score: 35,
      detail: `Not cited in ${snap.engine}`,
      createdAt: snap.checkedAt?.toISOString?.() ?? null,
    });
  }

  items.sort((a, b) => b.score - a.score);
  return items.slice(0, 60);
}
