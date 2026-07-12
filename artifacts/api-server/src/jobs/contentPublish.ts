import { eq, and, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentPublishPayload, ScheduledPublishSweepPayload, PgBoss } from "@workspace/jobs";
import { decryptCmsCredentials, type CmsIntegrationCredentials } from "../lib/cmsIntegrations";
import { parseAutopilotSettings, wordpressPublishStatus } from "../lib/autopilotScheduler";
import { getSocialAccessToken } from "../lib/socialTokens";
import { publishToLinkedIn } from "@workspace/connectors/linkedin";
import { publishThreadToTwitter, splitTwitterThread } from "@workspace/connectors/twitter";
import { publishToFacebookPage, publishToInstagram } from "@workspace/connectors/meta";
import { publishToWordPress } from "@workspace/connectors/wordpress";
import { publishToNotion } from "@workspace/connectors/notion";
import { publishToWebflow } from "@workspace/connectors/webflow";
import { logger } from "../lib/logger";

const FORMAT_TO_PLATFORM: Record<string, string> = {
  linkedin_post: "linkedin",
  twitter_thread: "twitter",
  instagram_post: "instagram",
  facebook_post: "facebook",
};

async function publishPiece(pieceId: number, userId: number): Promise<void> {
  const [piece] = await db
    .select()
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.id, pieceId))
    .limit(1);
  if (!piece) throw new Error("Content piece not found");
  if (piece.status === "published") return;

  const [project] = await db
    .select({
      cmsIntegrations: websiteProjectsTable.cmsIntegrations,
      autopilotSettings: websiteProjectsTable.autopilotSettings,
    })
    .from(websiteProjectsTable)
    .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, userId)))
    .limit(1);
  if (!project) throw new Error("Project not found");

  const autopilot = parseAutopilotSettings(project.autopilotSettings);
  const wpStatus = wordpressPublishStatus(autopilot);

  const creds = decryptCmsCredentials((project.cmsIntegrations ?? {}) as CmsIntegrationCredentials);
  const platform = piece.publishPlatform ?? FORMAT_TO_PLATFORM[piece.formatType];
  let publishedUrl: string | null = null;

  if (platform === "linkedin" && creds.linkedin) {
    const token = await getSocialAccessToken(piece.websiteProjectId, userId, "linkedin");
    const result = await publishToLinkedIn({ accessToken: token, authorUrn: creds.linkedin.authorUrn }, piece.title, piece.bodyMarkdown);
    publishedUrl = result.postUrl;
  } else if (platform === "twitter" && creds.twitter) {
    const token = await getSocialAccessToken(piece.websiteProjectId, userId, "twitter");
    const result = await publishThreadToTwitter({ accessToken: token }, splitTwitterThread(piece.bodyMarkdown));
    publishedUrl = result.postUrls[0] ?? null;
  } else if (platform === "instagram" && creds.meta?.instagramAccountId) {
    const token = await getSocialAccessToken(piece.websiteProjectId, userId, "meta");
    const result = await publishToInstagram(
      { accessToken: token, pageId: creds.meta.pageId, instagramAccountId: creds.meta.instagramAccountId },
      piece.bodyMarkdown,
    );
    publishedUrl = result.postUrl;
  } else if (platform === "facebook" && creds.meta?.pageId) {
    const token = await getSocialAccessToken(piece.websiteProjectId, userId, "meta");
    const result = await publishToFacebookPage(
      { accessToken: token, pageId: creds.meta.pageId, instagramAccountId: creds.meta.instagramAccountId },
      piece.bodyMarkdown,
    );
    publishedUrl = result.postUrl;
  } else if (piece.formatType === "blog_post" && creds.wordpress) {
    const result = await publishToWordPress(
      { siteUrl: creds.wordpress.siteUrl, username: creds.wordpress.username, appPassword: creds.wordpress.appPassword },
      piece.title,
      piece.bodyMarkdown,
      wpStatus,
    );
    publishedUrl = result.url;
  } else if (creds.notion && !platform) {
    publishedUrl = await publishToNotion(creds.notion.integrationToken, creds.notion.databaseId, piece.title, piece.bodyMarkdown);
  } else if (creds.webflow && !platform) {
    publishedUrl = await publishToWebflow(
      creds.webflow.apiToken,
      creds.webflow.collectionId,
      creds.webflow.bodyFieldSlug,
      piece.title,
      piece.bodyMarkdown,
    );
  } else {
    throw new Error(`No publish destination for format ${piece.formatType}`);
  }

  await db
    .update(contentPiecesTable)
    .set({ status: "published", publishedUrl, publishPlatform: platform ?? piece.publishPlatform, publishError: null })
    .where(eq(contentPiecesTable.id, pieceId));
}

export async function registerContentPublishHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentPublishPayload>(QUEUES.contentPublish, async ([job]) => {
    const { contentPieceId, userId } = job.data;
    try {
      await publishPiece(contentPieceId, userId);
      logger.info({ contentPieceId }, "Content publish job completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      await db
        .update(contentPiecesTable)
        .set({ publishError: message, status: "ready" })
        .where(eq(contentPiecesTable.id, contentPieceId));
      logger.error({ err, contentPieceId }, "Content publish job failed");
      throw err;
    }
  });
}

export async function registerScheduledPublishSweepHandler(boss: PgBoss): Promise<void> {
  await boss.work<ScheduledPublishSweepPayload>(QUEUES.scheduledPublishSweep, async () => {
    const today = new Date().toISOString().slice(0, 10);
    const duePieces = await db
      .select({
        id: contentPiecesTable.id,
        websiteProjectId: contentPiecesTable.websiteProjectId,
      })
      .from(contentPiecesTable)
      .innerJoin(websiteProjectsTable, eq(contentPiecesTable.websiteProjectId, websiteProjectsTable.id))
      .where(
        and(
          lte(contentPiecesTable.plannedDate, today),
          eq(contentPiecesTable.status, "ready"),
        ),
      );

    logger.info({ count: duePieces.length }, "Scheduled publish sweep");

    for (const piece of duePieces) {
      const [project] = await db
        .select({ userId: websiteProjectsTable.userId })
        .from(websiteProjectsTable)
        .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
        .limit(1);
      if (!project) continue;
      await enqueue(QUEUES.contentPublish, { contentPieceId: piece.id, userId: project.userId });
    }
  });
}

export { publishPiece };
