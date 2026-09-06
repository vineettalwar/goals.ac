import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, wordpressConnectionsTable, companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner } from "@/lib/content/content-pieces-helpers";
import {
  decryptCmsCredentials,
  ESP_PUBLISH_PLATFORMS,
  CMS_PUBLISH_PLATFORMS,
  SOCIAL_PLATFORMS,
  type CmsIntegrationCredentials,
  type SocialPlatform,
} from "@workspace/content-engine/support/publishing/cms-integrations";
import {
  isSocialPlatform,
  publishPieceToSocial,
} from "@workspace/content-engine/support/social/social-publish";
import { publishPieceToDestination,
} from "@workspace/content-engine/support/publishing/publish-destination";
import { resolveEntitlementsForProject } from "@workspace/content-engine/support/publishing/resolve-publish-entitlements";
import { withPublishRecord } from "@workspace/content-engine/support/publishing/publish-records";
import { publishPieceToWordPress } from "@workspace/content-engine/support/publishing/cms-publish";
import { featuredImageFromMetadata } from "@workspace/content-engine/articles/article-image-enricher";
import { assessPublishReadiness } from "@workspace/content-engine/content/publish-readiness";
import { decryptSecret } from "@workspace/security/encryption";
import { enqueue, QUEUES } from "@workspace/jobs";
import { ingestPublishedContentPiece } from "@workspace/content-engine/support/brand/brand-voice-generation";
import { seedSocialPostMetrics } from "@workspace/content-engine/social/social-metrics-service";
import { z } from "zod";

const ALL_PUBLISH_PLATFORMS = [
  ...CMS_PUBLISH_PLATFORMS,
  "notion",
  "webflow",
  "wordpress",
  "wix",
  "framer",
  "squarespace",
  "contentful",
  "sanity",
  "strapi",
  "hubspot",
  "typo3",
  ...ESP_PUBLISH_PLATFORMS,
  ...SOCIAL_PLATFORMS,
] as const;

const PublishBody = z.object({
  platform: z.enum(ALL_PUBLISH_PLATFORMS as unknown as [string, ...string[]]).optional(),
  wordpressConnectionId: z.number().int().positive().optional(),
  async: z.boolean().optional(),
  /** Required to publish despite blockers from assessPublishReadiness. Persisted for audit. */
  overrideReason: z.string().min(10).max(500).optional(),
}).refine(
  (d) => d.platform || d.wordpressConnectionId,
  { message: "Provide platform or WordPress connection" },
);

function featuredImageFromPiece(piece: {
  bodyMarkdown: string;
  pieceMetadata?: { featuredImageUrl?: string } | null;
}): string | undefined {
  return featuredImageFromMetadata({
    bodyMarkdown: piece.bodyMarkdown,
    pieceMetadata: piece.pieceMetadata,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PublishBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const readiness = assessPublishReadiness({
    title: piece!.title,
    bodyMarkdown: piece!.bodyMarkdown ?? "",
    pieceMetadata: piece!.pieceMetadata,
  });

  if (!readiness.ok && !parsed.data.overrideReason) {
    return NextResponse.json(
      {
        error: "Content not ready to publish",
        blockers: readiness.blockers,
        warnings: readiness.warnings,
        qualityScore: readiness.qualityScore,
      },
      { status: 422 },
    );
  }

  const publishOverride = !readiness.ok
    ? {
        reason: parsed.data.overrideReason,
        blockers: readiness.blockers,
        userId: userId!,
        overriddenAt: new Date().toISOString(),
      }
    : undefined;

  if (parsed.data.async) {
    if (publishOverride) {
      await db
        .update(contentPiecesTable)
        .set({
          pieceMetadata: {
            ...((piece!.pieceMetadata as Record<string, unknown> | null) ?? {}),
            publishOverride,
          },
        })
        .where(eq(contentPiecesTable.id, id));
    }
    // Pass platform so the job publishes to the destination picked in the dialog
    // (not FORMAT_TO_PLATFORM / primary-connection fallback).
    await enqueue(QUEUES.contentPublish, {
      contentPieceId: id,
      userId: userId!,
      platform: parsed.data.platform,
    });
    return NextResponse.json({ queued: true, warnings: readiness.warnings });
  }

  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, piece!.websiteProjectId))
    .limit(1);

  const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);
  const entitlements = await resolveEntitlementsForProject(piece!.websiteProjectId, userId!);

  const recordProvider =
    parsed.data.platform ??
    (parsed.data.wordpressConnectionId ? "wordpress" : null) ??
    "auto";

  try {
    const publishOutcome = await withPublishRecord(
      {
        contentPieceId: id,
        websiteProjectId: piece!.websiteProjectId,
        provider: recordProvider,
        connectionId: parsed.data.wordpressConnectionId ?? null,
      },
      async () => {
        let publishedUrl: string;
        let publishPlatform = parsed.data.platform ?? "wordpress";
        let remotePostId: string | undefined;
        let outputMode: string | null = null;
        const publishable = {
          id: piece!.id,
          title: piece!.title,
          bodyMarkdown: piece!.bodyMarkdown,
          targetKeyword: piece!.targetKeyword,
          formatType: piece!.formatType,
          pieceMetadata: piece!.pieceMetadata,
        };
        const imageUrl = featuredImageFromPiece(piece!);

        if (parsed.data.platform && isSocialPlatform(parsed.data.platform)) {
          const socialResult = await publishPieceToSocial(
            parsed.data.platform as SocialPlatform,
            {
              ...publishable,
              websiteProjectId: piece!.websiteProjectId,
              featuredImageUrl: imageUrl,
              approvalStatus: piece!.approvalStatus,
              pieceMetadata: piece!.pieceMetadata,
            },
            userId!,
            creds,
          );
          publishedUrl = socialResult.publishedUrl;
          publishPlatform = socialResult.publishPlatform;
          remotePostId = socialResult.remotePostId;
        } else if (parsed.data.wordpressConnectionId) {
          const [row] = await db
            .select({ connection: wordpressConnectionsTable })
            .from(wordpressConnectionsTable)
            .innerJoin(companiesTable, eq(companiesTable.id, wordpressConnectionsTable.companyId))
            .where(
              and(
                eq(wordpressConnectionsTable.id, parsed.data.wordpressConnectionId),
                eq(companiesTable.userId, userId!),
              ),
            )
            .limit(1);

          if (!row) throw new Error("WordPress connection not found");

          const wpCreds: CmsIntegrationCredentials = {
            wordpress: {
              siteUrl: row.connection.siteUrl,
              username: row.connection.username,
              appPassword: decryptSecret(row.connection.encryptedAppPassword),
            },
          };
          publishedUrl = await publishPieceToWordPress(publishable, wpCreds, {
            status: row.connection.defaultStatus === "draft" ? "draft" : "publish",
          });
        } else if (parsed.data.platform) {
          const result = await publishPieceToDestination(parsed.data.platform, publishable, creds, {
            featuredImageUrl: imageUrl,
            entitlements,
            idempotencyKey: `piece-${id}`,
          });
          publishedUrl = result.publishedUrl;
          publishPlatform = result.publishPlatform;
          outputMode = result.outputMode ?? null;
          return {
            publishedUrl,
            publishPlatform,
            remotePostId,
            outputMode,
            warnings: result.warnings ?? [],
          };
        } else {
          throw new Error("Platform not connected");
        }

        return { publishedUrl, publishPlatform, remotePostId, outputMode, warnings: [] as { code: string; message: string }[] };
      },
    );

    const { publishedUrl, publishPlatform, remotePostId, warnings } = publishOutcome as {
      publishedUrl: string;
      publishPlatform: string;
      remotePostId?: string;
      warnings?: { code: string; message: string }[];
    };

    const meta = {
      ...((piece!.pieceMetadata as Record<string, unknown> | null) ?? {}),
      ...(warnings && warnings.length > 0
        ? { lastPublishWarnings: warnings }
        : { lastPublishWarnings: undefined }),
      ...(publishOverride ? { publishOverride } : {}),
    };

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        status: "published",
        publishedUrl,
        publishPlatform,
        publishError: null,
        pieceMetadata: meta,
      })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    if (remotePostId && isSocialPlatform(publishPlatform)) {
      await seedSocialPostMetrics({
        contentPieceId: id,
        platform: publishPlatform,
        remotePostId,
      });
    }

    ingestPublishedContentPiece(
      piece!.websiteProjectId,
      id,
      piece!.title,
      piece!.bodyMarkdown ?? "",
      publishedUrl,
    ).catch(() => {});

    return NextResponse.json({
      ...updated,
      warnings: [...readiness.warnings, ...(warnings ?? [])],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to publish" },
      { status: 502 },
    );
  }
}
