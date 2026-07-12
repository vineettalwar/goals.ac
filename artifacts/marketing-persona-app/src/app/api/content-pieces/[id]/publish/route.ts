import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable, wordpressConnectionsTable, companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { assertPieceOwner } from "@/lib/content-pieces-helpers";
import {
  decryptCmsCredentials,
  CMS_PUBLISH_PLATFORMS,
  SOCIAL_PLATFORMS,
  type CmsPublishPlatform,
  type CmsIntegrationCredentials,
  type SocialPlatform,
} from "@workspace/content-engine/support/cms-integrations";
import {
  isSocialPlatform,
  publishPieceToSocial,
} from "@workspace/content-engine/support/social-publish";
import {
  publishPieceToCms,
  publishPieceToWordPress,
} from "@workspace/content-engine/support/cms-publish";
import { publishToNotion } from "@workspace/connectors/notion";
import { publishToWebflow } from "@workspace/connectors/webflow";
import { publishToWordPress } from "@workspace/connectors/wordpress";
import { decryptSecret } from "@workspace/security/encryption";
import { enqueue, QUEUES } from "@workspace/jobs";
import { z } from "zod";

const ALL_PUBLISH_PLATFORMS = [
  ...CMS_PUBLISH_PLATFORMS,
  "notion",
  "webflow",
  "wordpress",
  ...SOCIAL_PLATFORMS,
] as const;

const PublishBody = z.object({
  platform: z.enum(ALL_PUBLISH_PLATFORMS as unknown as [string, ...string[]]).optional(),
  wordpressConnectionId: z.number().int().positive().optional(),
  wpSiteUrl: z.string().url().optional(),
  wpUsername: z.string().optional(),
  wpAppPassword: z.string().optional(),
  async: z.boolean().optional(),
}).refine(
  (d) => d.platform || d.wordpressConnectionId || (d.wpSiteUrl && d.wpUsername && d.wpAppPassword),
  { message: "Provide platform or WordPress credentials" },
);

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

  if (parsed.data.async) {
    await enqueue(QUEUES.contentPublish, { contentPieceId: id, userId: userId! });
    return NextResponse.json({ queued: true });
  }

  const [project] = await db
    .select({ cmsIntegrations: websiteProjectsTable.cmsIntegrations })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, piece!.websiteProjectId))
    .limit(1);

  const creds = decryptCmsCredentials((project?.cmsIntegrations ?? {}) as Record<string, unknown>);

  try {
    let publishedUrl: string;
    let publishPlatform = parsed.data.platform ?? "wordpress";
    const publishable = {
      id: piece!.id,
      title: piece!.title,
      bodyMarkdown: piece!.bodyMarkdown,
      targetKeyword: piece!.targetKeyword,
      formatType: piece!.formatType,
    };

    if (parsed.data.platform && isSocialPlatform(parsed.data.platform)) {
      const socialResult = await publishPieceToSocial(
        parsed.data.platform as SocialPlatform,
        { ...publishable, websiteProjectId: piece!.websiteProjectId },
        userId!,
        creds,
      );
      publishedUrl = socialResult.publishedUrl;
      publishPlatform = socialResult.publishPlatform;
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

      if (!row) return NextResponse.json({ error: "WordPress connection not found" }, { status: 404 });

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
    } else if (parsed.data.wpSiteUrl && parsed.data.wpUsername && parsed.data.wpAppPassword) {
      const result = await publishToWordPress(
        {
          siteUrl: parsed.data.wpSiteUrl,
          username: parsed.data.wpUsername,
          appPassword: parsed.data.wpAppPassword,
        },
        piece!.title,
        piece!.bodyMarkdown,
        "publish",
      );
      publishedUrl = result.url;
    } else if (parsed.data.platform === "notion" && creds.notion) {
      publishedUrl = await publishToNotion(
        creds.notion.integrationToken,
        creds.notion.databaseId,
        piece!.title,
        piece!.bodyMarkdown,
        { status: piece!.status ?? "draft" },
      );
    } else if (parsed.data.platform === "webflow" && creds.webflow) {
      publishedUrl = await publishToWebflow(
        creds.webflow.apiToken,
        creds.webflow.collectionId,
        creds.webflow.bodyFieldSlug,
        piece!.title,
        piece!.bodyMarkdown,
      );
    } else if (
      parsed.data.platform &&
      CMS_PUBLISH_PLATFORMS.includes(parsed.data.platform as CmsPublishPlatform)
    ) {
      publishedUrl = await publishPieceToCms(
        parsed.data.platform as CmsPublishPlatform,
        publishable,
        creds,
      );
    } else {
      return NextResponse.json({ error: "Platform not connected" }, { status: 400 });
    }

    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        status: "published",
        publishedUrl,
        publishPlatform,
        publishError: null,
      })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to publish" },
      { status: 502 },
    );
  }
}
