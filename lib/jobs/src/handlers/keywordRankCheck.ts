import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  trackedKeywordsTable,
  keywordRankSnapshotsTable,
  keywordRankAlertsTable,
  websiteProjectsTable,
} from "@workspace/db/schema";
import { getSerpProvider } from "@workspace/serp-provider";
import { buildRankDropAlert } from "@workspace/seo-tools/keywordGapAnalyzer";
import { createRankDropOpportunity } from "@workspace/content-engine/strategy/keyword-opportunity-service";
import { QUEUES, enqueue } from "@workspace/jobs";
import type {
  KeywordRankCheckJobData,
  KeywordRankCheckPayload,
  PgBoss,
} from "@workspace/jobs";
import { logger } from "../logger";
import { shouldSkipRankCheck } from "./keyword-rank-debounce";

const KEYWORD_RANK_SWEEP_CRON = "0 6 * * *";

export async function processKeywordRankCheck(data: KeywordRankCheckJobData): Promise<void> {
  if (isSingleKeywordPayload(data)) {
    await checkSingleKeyword(data.trackedKeywordId);
  } else {
    await sweepAllKeywords();
  }
}

export async function registerKeywordRankCheckHandler(boss: PgBoss): Promise<void> {
  await boss.work<KeywordRankCheckJobData>(QUEUES.keywordRankCheck, async ([job]) => {
    await processKeywordRankCheck(job.data);
  });
}

function isSingleKeywordPayload(
  data: KeywordRankCheckJobData,
): data is KeywordRankCheckPayload {
  return typeof (data as Partial<KeywordRankCheckPayload>).trackedKeywordId === "number";
}

async function sweepAllKeywords(): Promise<void> {
  const rows = await db
    .select({ id: trackedKeywordsTable.id, lastCheckedAt: trackedKeywordsTable.lastCheckedAt })
    .from(trackedKeywordsTable)
    .where(eq(trackedKeywordsTable.isActive, true));

  logger.info({ count: rows.length }, "Keyword rank sweep: enumerated tracked keywords");

  const now = new Date();
  let skipped = 0;
  for (const row of rows) {
    if (shouldSkipRankCheck(row.lastCheckedAt, now)) {
      skipped++;
      continue;
    }
    await enqueue(QUEUES.keywordRankCheck, { trackedKeywordId: row.id });
  }
  if (skipped > 0) {
    logger.info({ skipped }, "Keyword rank sweep: skipped recently-checked keywords (debounce)");
  }
}

async function checkSingleKeyword(trackedKeywordId: number): Promise<void> {
  try {
    const [kw] = await db
      .select()
      .from(trackedKeywordsTable)
      .where(eq(trackedKeywordsTable.id, trackedKeywordId))
      .limit(1);

    if (!kw || !kw.isActive) {
      logger.warn({ trackedKeywordId }, "Tracked keyword not found or inactive");
      return;
    }

    if (shouldSkipRankCheck(kw.lastCheckedAt)) {
      logger.info({ trackedKeywordId, lastCheckedAt: kw.lastCheckedAt }, "Keyword rank check skipped — debounce active (checked within 45 min)");
      return;
    }

    let targetUrl = kw.targetUrl;
    if (!targetUrl) {
      const [project] = await db
        .select({ url: websiteProjectsTable.url })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, kw.websiteProjectId))
        .limit(1);
      targetUrl = project?.url ?? null;
    }

    const provider = getSerpProvider();
    if (!provider.isConfigured()) {
      logger.warn("SERP provider not configured; skipping rank check");
      return;
    }

    const [previous] = await db
      .select()
      .from(keywordRankSnapshotsTable)
      .where(eq(keywordRankSnapshotsTable.trackedKeywordId, kw.id))
      .orderBy(desc(keywordRankSnapshotsTable.checkedAt))
      .limit(1);

    const result = await provider.checkRank({
      keyword: kw.keyword,
      targetUrl: targetUrl ?? undefined,
      location: kw.location,
      language: kw.language,
      device: kw.device as "desktop" | "mobile",
    });

    await db.insert(keywordRankSnapshotsTable).values({
      trackedKeywordId: kw.id,
      position: result.position,
      rankingUrl: result.rankingUrl,
      serpFeatures: result.serpFeatures,
      provider: result.provider,
    });

    await db
      .update(trackedKeywordsTable)
      .set({ lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(eq(trackedKeywordsTable.id, kw.id));

    const alert = buildRankDropAlert({
      keyword: kw.keyword,
      previousPosition: previous?.position ?? null,
      currentPosition: result.position,
    });

    if (alert && previous) {
      await db.insert(keywordRankAlertsTable).values({
        websiteProjectId: kw.websiteProjectId,
        trackedKeywordId: kw.id,
        keyword: kw.keyword,
        previousPosition: previous.position,
        currentPosition: result.position,
        changeAmount: alert.changeAmount,
        severity: alert.severity,
        message: alert.message,
        status: "open",
      });

      if (previous.position != null && result.position != null && previous.position < result.position) {
        await createRankDropOpportunity({
          projectId: kw.websiteProjectId,
          keyword: kw.keyword,
          previousPosition: previous.position,
          currentPosition: result.position,
        });
      }
    }
  } catch (err) {
    logger.error({ err, trackedKeywordId }, "Keyword rank check failed");
  }
}

export { KEYWORD_RANK_SWEEP_CRON };
