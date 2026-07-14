import { NextResponse } from "next/server";
import { marked } from "marked";
import { db } from "@workspace/db";
import { integrationConnectionsTable, companiesTable, scheduledArticlesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { decryptSecret } from "@workspace/security/encryption";
import { publishToGhost } from "@workspace/connectors/ghost";
import { publishToWebhook, type WebhookArticlePayload } from "@workspace/connectors/webhook";
import { z } from "zod";

interface ArticleMetadata {
  citations?: { text: string; url: string; source: string }[];
  faqSection?: { question: string; answer: string }[];
  jsonLdSchema?: object;
}

const publishSchema = z.object({
  articleId: z.number(),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const connectionId = parseInt(id, 10);
  if (isNaN(connectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "articleId is required" }, { status: 400 });

  const rows = await db
    .select({
      connection: integrationConnectionsTable,
      article: scheduledArticlesTable,
    })
    .from(integrationConnectionsTable)
    .innerJoin(companiesTable, eq(companiesTable.id, integrationConnectionsTable.companyId))
    .innerJoin(
      scheduledArticlesTable,
      and(
        eq(scheduledArticlesTable.id, parsed.data.articleId),
        eq(scheduledArticlesTable.companyId, integrationConnectionsTable.companyId)
      )
    )
    .where(and(eq(integrationConnectionsTable.id, connectionId), eq(companiesTable.userId, userId!)))
    .limit(1);

  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Connection or article not found" }, { status: 404 });

  const { connection, article } = row;
  if (!article.bodyMarkdown || !article.title) {
    return NextResponse.json({ error: "Article has no content to publish" }, { status: 400 });
  }

  const secret = decryptSecret(connection.encryptedSecret);
  const meta = (article.articleMetadata ?? {}) as ArticleMetadata;

  try {
    let publishedUrl: string;

    if (connection.provider === "ghost") {
      const status = connection.defaultStatus === "published" ? "published" : "draft";
      const keywords = [article.primaryKeyword, ...article.secondaryKeywords].filter(
        (k): k is string => !!k
      );
      const result = await publishToGhost(
        { apiUrl: connection.url ?? "", adminApiKey: secret },
        article.title,
        article.bodyMarkdown,
        status,
        article.metaDescription ?? undefined,
        keywords
      );
      publishedUrl = result.url;
    } else {
      const status = connection.defaultStatus === "publish" ? "publish" : "draft";
      const payload: WebhookArticlePayload = {
        title: article.title,
        slug: slugify(article.title),
        bodyMarkdown: article.bodyMarkdown,
        bodyHtml: await marked(article.bodyMarkdown),
        metaDescription: article.metaDescription ?? undefined,
        keywords: [article.primaryKeyword, ...article.secondaryKeywords].filter(
          (k): k is string => !!k
        ),
        faq: meta.faqSection,
        citations: meta.citations,
        jsonLd: meta.jsonLdSchema,
        publishedStatus: status,
      };
      await publishToWebhook({ url: connection.url ?? "", signingSecret: secret }, payload);
      publishedUrl = connection.url ?? "";
    }

    const [updated] = await db
      .update(scheduledArticlesTable)
      .set({
        status: "published",
        publishedUrl,
      })
      .where(eq(scheduledArticlesTable.id, article.id))
      .returning();

    return NextResponse.json({ article: updated, url: publishedUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
