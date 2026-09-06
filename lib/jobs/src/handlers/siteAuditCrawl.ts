import { eq } from "drizzle-orm";
import {
  db,
  siteAuditsTable,
  siteAuditPagesTable,
  siteAuditIssuesTable,
} from "@workspace/db";
import {
  runSiteAuditCrawl,
  getIssueDescriptor,
} from "@workspace/seo-tools/site-audit";
import { QUEUES, type SiteAuditCrawlPayload, type PgBoss } from "@workspace/jobs";
import { logger } from "../logger";

export async function processSiteAuditCrawl(payload: SiteAuditCrawlPayload): Promise<void> {
  const { siteAuditId } = payload;
  const [audit] = await db
    .select()
    .from(siteAuditsTable)
    .where(eq(siteAuditsTable.id, siteAuditId))
    .limit(1);

  if (!audit) {
    logger.warn({ siteAuditId }, "Site audit not found");
    return;
  }

  await db
    .update(siteAuditsTable)
    .set({ status: "running" })
    .where(eq(siteAuditsTable.id, siteAuditId));

  try {
    const result = await runSiteAuditCrawl({
      startUrl: audit.startUrl,
      maxPages: audit.maxPages,
    });

    if (result.pages.length > 0) {
      await db.insert(siteAuditPagesTable).values(
        result.pages.map((p: (typeof result.pages)[number]) => ({
          siteAuditId,
          url: p.url,
          statusCode: p.statusCode,
          fetchClass: p.fetchClass,
          title: p.title,
          metaDescription: p.metaDescription,
          wordCount: p.wordCount,
          crawlDepth: p.crawlDepth,
          fromSitemap: p.fromSitemap,
        })),
      );
    }

    if (result.issues.length > 0) {
      await db.insert(siteAuditIssuesTable).values(
        result.issues.map((issue: (typeof result.issues)[number]) => {
          const desc = getIssueDescriptor(issue.issueType);
          return {
            siteAuditId,
            issueType: issue.issueType,
            severity: desc?.severity ?? "info",
            pageUrl: issue.pageUrl,
            title: desc?.title ?? issue.issueType,
            explanation: desc?.explanation ?? "",
            howToFix: desc?.howToFix ?? "",
            details: issue.details ?? null,
          };
        }),
      );
    }

    await db
      .update(siteAuditsTable)
      .set({
        status: "done",
        pagesCrawled: result.pagesCrawled,
        crawlComplete: result.crawlComplete,
        completedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(siteAuditsTable.id, siteAuditId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, siteAuditId }, "Site audit crawl failed");
    await db
      .update(siteAuditsTable)
      .set({
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      })
      .where(eq(siteAuditsTable.id, siteAuditId));
    throw err;
  }
}

export async function registerSiteAuditCrawlHandler(boss: PgBoss): Promise<void> {
  await boss.work<SiteAuditCrawlPayload>(QUEUES.siteAuditCrawl, async ([job]) => {
    await processSiteAuditCrawl(job.data);
  });
}
