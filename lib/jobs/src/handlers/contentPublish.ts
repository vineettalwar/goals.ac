import { eq, and, lte, notInArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, SOCIAL_FORMAT_TYPES } from "@workspace/db";
import { QUEUES, enqueue } from "@workspace/jobs";
import type { ContentPublishPayload, ScheduledPublishSweepPayload, PgBoss } from "@workspace/jobs";
import { decryptCmsCredentials, type CmsIntegrationCredentials } from "@workspace/content-engine/support/publishing/cms-integrations";
import { parseAutopilotSettings, wordpressPublishStatus } from "@workspace/content-engine/support/autopilot/autopilot-scheduler";
import { publishPieceToSocial, isSocialPlatform } from "@workspace/content-engine/support/social/social-publish";
import { listDueSocialPieces } from "@workspace/content-engine/support/social/social-queue-service";
import { featuredImageFromMetadata } from "@workspace/content-engine/articles/article-image-enricher";
import {
  publishPieceToDestination,
  publishBlogPieceToPrimaryDestination,
  resolvePrimaryBlogDestination,
  resolvePrimaryEspDestination,
} from "@workspace/content-engine/support/publishing/publish-destination";
import { withPublishRecord } from "@workspace/content-engine/support/publishing/publish-records";
import { collectReadinessInputs } from "@workspace/content-engine/support/publishing/readiness-inputs";
import { assessPublishReadiness } from "@workspace/content-engine/content/publish-readiness";
import { resolveWordPressConnectionType } from "@workspace/content-engine/support/publishing/cms-integrations";
import { fetchGoalsAcSiteGraph } from "@workspace/connectors/goals-ac-plugin";
import { logger } from "../logger";
import { seedSocialPostMetrics } from "@workspace/content-engine/social/social-metrics-service";

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
  pieceMetadata?: { featuredImageUrl?: string; images?: import("@workspace/db").ContentPieceImageRef[] } | null;
}): string | undefined {
  return featuredImageFromMetadata({
    bodyMarkdown: piece.bodyMarkdown,
    pieceMetadata: piece.pieceMetadata,
  });
}

async function publishPiece(
  pieceId: number,
  userId: number,
  platformOverride?: string,
): Promise<void> {
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
  const platform = platformOverride ?? piece.publishPlatform ?? FORMAT_TO_PLATFORM[piece.formatType];

  // Autopilot, the scheduled sweep, and cf-write-worker all funnel through this
  // function with no human present to supply an overrideReason. A blocker must
  // therefore neither publish nor silently vanish: hold the piece at "draft" (the
  // same status used to pull regulated-vertical pieces back for human review) so
  // it surfaces for attention instead of being force-published or looping through
  // the scheduled sweep, which only selects status "ready".
  const existingMetadata = piece.pieceMetadata ?? undefined;
  const overrideReason = existingMetadata?.publishOverride?.reason;
  if (!overrideReason) {
    // A human override means "do not spend time verifying anything" -- this
    // branch (and its network calls) only runs when there is no override.
    const effectiveDestination = platform ?? resolvePrimaryBlogDestination(creds);
    const connectionType =
      effectiveDestination === "wordpress" && creds.wordpress
        ? resolveWordPressConnectionType(creds.wordpress)
        : undefined;
    const pluginCreds =
      connectionType === "plugin" && creds.wordpress?.siteUrl && creds.wordpress.siteKey
        ? { siteUrl: creds.wordpress.siteUrl, siteKey: creds.wordpress.siteKey, platform: "wordpress" as const }
        : null;

    const readinessInputs = await collectReadinessInputs({
      bodyMarkdown: piece.bodyMarkdown ?? "",
      citations: piece.pieceMetadata?.citations,
      internalLinkSuggestions: piece.pieceMetadata?.internalLinkSuggestions,
      // Fetched at most once per publish run (there is exactly one call site
      // here), and only when the destination is the goals.ac WordPress plugin
      // with real credentials -- otherwise no fetcher is passed and the
      // dangling-link check is skipped rather than failed.
      siteGraphFetcher: pluginCreds ? () => fetchGoalsAcSiteGraph(pluginCreds) : undefined,
    });

    const readiness = assessPublishReadiness(
      {
        title: piece.title,
        bodyMarkdown: piece.bodyMarkdown ?? "",
        pieceMetadata: piece.pieceMetadata,
      },
      readinessInputs,
    );
    for (const warning of readiness.warnings) {
      logger.warn({ pieceId, code: warning.code, message: warning.message }, "Publish readiness warning");
    }
    if (!readiness.ok) {
      const priorAttempt = existingMetadata?.publishBlocked?.attempt ?? 0;
      await db
        .update(contentPiecesTable)
        .set({
          status: "draft",
          publishError: `Blocked by readiness gate: ${readiness.blockers.map((b) => b.message).join(" ")}`,
          pieceMetadata: {
            ...(existingMetadata ?? {}),
            publishBlocked: {
              blockers: readiness.blockers,
              blockedAt: new Date().toISOString(),
              attempt: priorAttempt + 1,
            },
          },
        })
        .where(eq(contentPiecesTable.id, pieceId));
      logger.error(
        { pieceId, blockers: readiness.blockers.map((b) => b.code) },
        "Publish blocked by readiness gate, held for human review",
      );
      return;
    }
  }

  // Wave 5.C.3: skip destinations with known-failed health (do not burn publish attempts).
  if (platform && !isSocialPlatform(platform) && platform !== "beehiiv") {
    const rawIntegrations = (project.cmsIntegrations ?? {}) as Record<string, { lastHealthOk?: boolean }>;
    const raw = rawIntegrations[platform];
    if (raw && raw.lastHealthOk === false) {
      const message = `Skipped publish: ${platform} integration health is failing. Reconnect or fix credentials.`;
      await db
        .update(contentPiecesTable)
        .set({ publishError: message })
        .where(eq(contentPiecesTable.id, pieceId));
      logger.warn({ pieceId, platform }, message);
      return;
    }
  }

  const publishable = {
    id: piece.id,
    title: piece.title,
    bodyMarkdown: piece.bodyMarkdown,
    targetKeyword: piece.targetKeyword,
    formatType: piece.formatType,
    pieceMetadata: piece.pieceMetadata,
  };
  const imageUrl = featuredImageFromPiece(piece);

  let publishedUrl: string | null = null;
  let publishPlatform = platform ?? piece.publishPlatform;
  let remotePostId: string | undefined;

  const runPublish = async (): Promise<{
    publishedUrl: string;
    publishPlatform: string;
    remotePostId?: string;
    outputMode?: string | null;
    warnings?: { code: string; message: string }[];
  }> => {
    if (platform && isSocialPlatform(platform)) {
      const result = await publishPieceToSocial(
        platform,
        {
          id: piece.id,
          title: piece.title,
          bodyMarkdown: piece.bodyMarkdown,
          websiteProjectId: piece.websiteProjectId,
          featuredImageUrl: imageUrl,
          pieceMetadata: piece.pieceMetadata,
        },
        userId,
        creds,
      );
      return {
        publishedUrl: result.publishedUrl,
        publishPlatform: result.publishPlatform,
        remotePostId: result.remotePostId,
        outputMode: null,
      };
    }
    if (piece.formatType === "email_sequence") {
      const espPlatform = resolvePrimaryEspDestination(creds, platform);
      if (!espPlatform) {
        throw new Error("No email platform connected for email_sequence format.");
      }
      const result = await publishPieceToDestination(espPlatform, publishable, creds);
      return {
        publishedUrl: result.publishedUrl,
        publishPlatform: result.publishPlatform,
        outputMode: result.outputMode ?? null,
      };
    }
    if (platform) {
      const result = await publishPieceToDestination(platform, publishable, creds, {
        status: wpStatus,
        featuredImageUrl: featuredImageFromPiece(piece),
      });
      return {
        publishedUrl: result.publishedUrl,
        publishPlatform: result.publishPlatform,
        outputMode: result.outputMode ?? null,
        warnings: result.warnings,
        remotePostId: result.remotePostId,
      };
    }
    const result = await publishBlogPieceToPrimaryDestination(publishable, creds, {
      status: wpStatus,
      featuredImageUrl: featuredImageFromPiece(piece),
    });
    return {
      publishedUrl: result.publishedUrl,
      publishPlatform: result.publishPlatform,
      outputMode: result.outputMode ?? null,
      warnings: result.warnings,
      remotePostId: result.remotePostId,
    };
  };

  const recordProvider = platform ?? piece.publishPlatform ?? "auto";
  const publishOutcome = await withPublishRecord(
    {
      contentPieceId: pieceId,
      websiteProjectId: piece.websiteProjectId,
      provider: recordProvider,
    },
    async () => {
      const result = await runPublish();
      return {
        publishedUrl: result.publishedUrl,
        publishPlatform: result.publishPlatform,
        remotePostId: result.remotePostId,
        outputMode: result.outputMode,
        warnings: result.warnings,
      };
    },
  );

  publishedUrl = publishOutcome.publishedUrl;
  publishPlatform = publishOutcome.publishPlatform;
  remotePostId = publishOutcome.remotePostId;

  const warningMessages = publishOutcome.warnings;
  const nextMeta = {
    ...(piece.pieceMetadata ?? {}),
    ...(warningMessages && warningMessages.length > 0
      ? { lastPublishWarnings: warningMessages }
      : { lastPublishWarnings: undefined }),
    publishBlocked: undefined,
  };

  await db
    .update(contentPiecesTable)
    .set({
      status: "published",
      publishedUrl,
      publishPlatform,
      publishError: null,
      pieceMetadata: nextMeta,
    })
    .where(eq(contentPiecesTable.id, pieceId));

  if (remotePostId && publishPlatform && isSocialPlatform(publishPlatform)) {
    await seedSocialPostMetrics({
      contentPieceId: pieceId,
      platform: publishPlatform,
      remotePostId,
    });
  }

  const { ingestPublishedContentPiece } = await import(
    "@workspace/content-engine/support/brand/brand-voice-generation"
  );
  await ingestPublishedContentPiece(
    piece.websiteProjectId,
    pieceId,
    piece.title,
    piece.bodyMarkdown ?? "",
    publishedUrl,
  ).catch((err: unknown) => {
    logger.warn({ err, contentPieceId: pieceId }, "Brand voice ingest after publish failed");
  });
}

export async function processContentPublish(payload: ContentPublishPayload): Promise<void> {
  const { contentPieceId, userId, platform } = payload;
  try {
    await publishPiece(contentPieceId, userId, platform);
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
}

export async function processScheduledPublishSweep(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const socialDue = await listDueSocialPieces(new Date());

  const blogDue = await db
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
        notInArray(contentPiecesTable.formatType, [...SOCIAL_FORMAT_TYPES]),
      ),
    );

  const duePieces = [
    ...socialDue.map((p: { id: number; websiteProjectId: number; userId: number }) => ({
      id: p.id,
      websiteProjectId: p.websiteProjectId,
      userId: p.userId,
    })),
    ...(
      await Promise.all(
        blogDue.map(async (piece) => {
          const [project] = await db
            .select({ userId: websiteProjectsTable.userId })
            .from(websiteProjectsTable)
            .where(eq(websiteProjectsTable.id, piece.websiteProjectId))
            .limit(1);
          return project ? { id: piece.id, websiteProjectId: piece.websiteProjectId, userId: project.userId } : null;
        }),
      )
    ).filter((p): p is { id: number; websiteProjectId: number; userId: number } => p !== null),
  ];

  logger.info({ count: duePieces.length, social: socialDue.length, blog: blogDue.length }, "Scheduled publish sweep");

  for (const piece of duePieces) {
    await enqueue(QUEUES.contentPublish, { contentPieceId: piece.id, userId: piece.userId });
  }
}

export async function registerContentPublishHandler(boss: PgBoss): Promise<void> {
  await boss.work<ContentPublishPayload>(QUEUES.contentPublish, async ([job]) => {
    await processContentPublish(job.data);
  });
}

export async function registerScheduledPublishSweepHandler(boss: PgBoss): Promise<void> {
  await boss.work<ScheduledPublishSweepPayload>(QUEUES.scheduledPublishSweep, async () => {
    await processScheduledPublishSweep();
  });
}

export { publishPiece };
