import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { decryptSecret } from "@workspace/security/encryption";
import { publishToNotion } from "@workspace/connectors/notion";
import { publishToWebflow } from "@workspace/connectors/webflow";
import { z } from "zod";

interface CmsIntegrationCredentials {
  notion?: {
    integrationToken: string;
    databaseId: string;
  };
  webflow?: {
    apiToken: string;
    collectionId: string;
    bodyFieldSlug: string;
  };
}

function decryptCmsCredentials(stored: CmsIntegrationCredentials): CmsIntegrationCredentials {
  const result: CmsIntegrationCredentials = {};
  if (stored.notion) {
    try {
      result.notion = {
        integrationToken: decryptSecret(stored.notion.integrationToken),
        databaseId: stored.notion.databaseId,
      };
    } catch {
      result.notion = stored.notion;
    }
  }
  if (stored.webflow) {
    try {
      result.webflow = {
        apiToken: decryptSecret(stored.webflow.apiToken),
        collectionId: stored.webflow.collectionId,
        bodyFieldSlug: stored.webflow.bodyFieldSlug,
      };
    } catch {
      result.webflow = stored.webflow;
    }
  }
  return result;
}

const PublishBody = z.object({
  platform: z.enum(["notion", "webflow"]),
});

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

  const { platform } = parsed.data;

  try {
    const [piece] = await db
      .select()
      .from(contentPiecesTable)
      .where(eq(contentPiecesTable.id, id))
      .limit(1);

    if (!piece) return NextResponse.json({ error: "Content piece not found" }, { status: 404 });

    const [project] = await db
      .select({ id: websiteProjectsTable.id, cmsIntegrations: websiteProjectsTable.cmsIntegrations })
      .from(websiteProjectsTable)
      .where(and(eq(websiteProjectsTable.id, piece.websiteProjectId), eq(websiteProjectsTable.userId, userId!)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const stored = (project.cmsIntegrations ?? {}) as CmsIntegrationCredentials;
    const creds = decryptCmsCredentials(stored);

    let publishedUrl: string;

    if (platform === "notion") {
      if (!creds.notion) {
        return NextResponse.json(
          { error: "Notion is not connected. Configure it in Project Settings." },
          { status: 400 },
        );
      }

      const tags: string[] = [];
      if (piece.targetKeyword) tags.push(piece.targetKeyword);
      if (piece.formatType) tags.push(piece.formatType.replace(/_/g, " "));

      publishedUrl = await publishToNotion(
        creds.notion.integrationToken,
        creds.notion.databaseId,
        piece.title,
        piece.bodyMarkdown,
        { status: piece.status ?? "draft", tags },
      );
    } else {
      if (!creds.webflow) {
        return NextResponse.json(
          { error: "Webflow is not connected. Configure it in Project Settings." },
          { status: 400 },
        );
      }

      publishedUrl = await publishToWebflow(
        creds.webflow.apiToken,
        creds.webflow.collectionId,
        creds.webflow.bodyFieldSlug,
        piece.title,
        piece.bodyMarkdown,
      );
    }

    const [updated] = await db
      .update(contentPiecesTable)
      .set({ status: "published", publishedUrl })
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
