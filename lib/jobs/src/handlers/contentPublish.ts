import { eq, and, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentPublishPayload, ScheduledPublishSweepPayload, PgBoss } from "@workspace/jobs";
import { decryptCmsCredentials, type CmsIntegrationCredentials } from "@workspace/content-engine/support/cms-integrations";
import { parseAutopilotSettings, wordpressPublishStatus } from "@workspace/content-engine/support/autopilot-scheduler";
import { publishPieceToSocial, isSocialPlatform } from "@workspace/content-engine/support/social-publish";
import {
  publishPieceToDestination,
  publishBlogPieceToPrimaryDestination,
  resolvePrimaryEspDestination,
} from "@workspace/content-engine/support/publish-destination";
import { logger } from "../logger";

const FORMAT_TO_PLATFORM: Record<string, string> = {
  linkedin_post: "linkedin",
  twitter_thread: "twitter",
  instagram_post: "instagram",
  facebook_post: "facebook",
  bluesky_post: "bluesky",
  mastodon_post: "mastodon",
  email_sequence: "beehiiv",
};

function featuredImageFromPiece(piece: {
  bodyMarkdown: string;
  pieceMetadata?: { featuredImageUrl?: string } | null;
}): string | undefined {
  if (piece.pieceMetadata?.featuredImageUrl) {
    return piece.pieceMetadata.featuredImageUrl;
  }
  const match = piece.bodyMarkdown.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/);
  return match?.[1];
}

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
  const publishable = {
    id: piece.id,
    title: piece.title,
    bodyMarkdown: piece.bodyMarkdown,
    targetKeyword: piece.targetKeyword,
    formatType: piece.formatType,
  };

  let publishedUrl: string | null = null;
  let publishPlatform = platform ?? piece.publishPlatform;

  if (platform && isSocialPlatform(platform)) {
    const result = await publishPieceToSocial(
      platform,
      {
        id: piece.id,
        title: piece.title,
        bodyMarkdown: piece.bodyMarkdown,
        websiteProjectId: piece.websiteProjectId,
      },
      userId,
      creds,
    );
    publishedUrl = result.publishedUrl;
    publishPlatform = result.publishPlatform;
  } else if (piece.formatType === "email_sequence") {
    const espPlatform = resolvePrimaryEspDestination(creds, platform);
    if (!espPlatform) {
      throw new Error("No email platform connected for email_sequence format.");
    }
    const result = await publishPieceToDestination(espPlatform, publishable, creds);
    publishedUrl = result.publishedUrl;
    publishPlatform = result.publishPlatform;
  } else if (platform) {
    const result = await publishPieceToDestination(platform, publishable, creds, {
      status: wpStatus,
      featuredImageUrl: featuredImageFromPiece(piece),
    });
    publishedUrl = result.publishedUrl;
    publishPlatform = result.publishPlatform;
  } else {
    const result = await publishBlogPieceToPrimaryDestination(publishable, creds, {
      status: wpStatus,
      featuredImageUrl: featuredImageFromPiece(piece),
    });
    publishedUrl = result.publishedUrl;
    publishPlatform = result.publishPlatform;
  }

  await db
    .update(contentPiecesTable)
    .set({ status: "published", publishedUrl, publishPlatform, publishError: null })
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
