import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { articleIdeaSourcesTable, websiteProjectsTable } from "@workspace/db/schema";
import { QUEUES, type ArticleIdeaSourceSyncJobData, type ArticleIdeaSourceSyncPayload, type PgBoss } from "@workspace/jobs";
import { syncArticleIdeaSource } from "@workspace/content-engine/articles/article-ideas-import-service";
import { logger } from "../logger";

/** Weekly on Monday at 08:00 UTC */
export const ARTICLE_IDEA_SOURCE_SYNC_CRON = "0 8 * * 1";

function isSourcePayload(data: ArticleIdeaSourceSyncJobData): data is ArticleIdeaSourceSyncPayload {
  return typeof (data as Partial<ArticleIdeaSourceSyncPayload>).sourceId === "number";
}

export async function registerArticleIdeaSourceSyncHandler(boss: PgBoss): Promise<void> {
  await boss.work<ArticleIdeaSourceSyncJobData>(QUEUES.articleIdeaSourceSync, async ([job]) => {
    const data = job.data;
    if (isSourcePayload(data)) {
      await runArticleIdeaSourceSync(data.sourceId, data.userId);
    } else {
      await sweepArticleIdeaSources();
    }
  });
}

async function runArticleIdeaSourceSync(sourceId: number, userId: number): Promise<void> {
  try {
    await syncArticleIdeaSource(sourceId, userId);
  } catch (err) {
    logger.error({ err, sourceId }, "Article idea source sync failed");
  }
}

async function sweepArticleIdeaSources(): Promise<void> {
  const sources = await db
    .select({
      id: articleIdeaSourcesTable.id,
      projectId: articleIdeaSourcesTable.projectId,
    })
    .from(articleIdeaSourcesTable)
    .where(
      and(
        isNotNull(articleIdeaSourcesTable.encryptedConfig),
        inArray(articleIdeaSourcesTable.syncStatus, ["ok", "idle", "error"]),
      ),
    );

  for (const source of sources) {
    const [project] = await db
      .select({ userId: websiteProjectsTable.userId })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, source.projectId))
      .limit(1);
    if (!project) continue;
    await runArticleIdeaSourceSync(source.id, project.userId);
  }
}

export { runArticleIdeaSourceSync };
