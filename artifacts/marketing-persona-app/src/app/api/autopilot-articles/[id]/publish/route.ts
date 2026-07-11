import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { scheduledArticlesTable, companiesTable, wordpressConnectionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { publishToWordPress } from "@/lib/publishers/wordpress";
import { decryptSecret } from "@workspace/security/encryption";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const articleId = parseInt(id, 10);

  const rows = await db
    .select({
      article: scheduledArticlesTable,
      company: companiesTable,
      wp: wordpressConnectionsTable,
    })
    .from(scheduledArticlesTable)
    .innerJoin(companiesTable, eq(companiesTable.id, scheduledArticlesTable.companyId))
    .leftJoin(wordpressConnectionsTable, eq(wordpressConnectionsTable.companyId, companiesTable.id))
    .where(and(eq(scheduledArticlesTable.id, articleId), eq(companiesTable.userId, userId!)))
    .limit(1);

  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { article, wp } = row;
  if (!article.bodyMarkdown || !article.title) {
    return NextResponse.json({ error: "Article has no content to publish" }, { status: 400 });
  }
  if (!wp) {
    return NextResponse.json({ error: "No WordPress connection configured" }, { status: 400 });
  }

  try {
    const appPassword = decryptSecret(wp.encryptedAppPassword);
    const result = await publishToWordPress(
      { siteUrl: wp.siteUrl, username: wp.username, appPassword },
      article.title,
      article.bodyMarkdown,
      (wp.defaultStatus as "draft" | "publish") ?? "draft",
      article.metaDescription ?? undefined,
      wp.defaultCategoryId ? [wp.defaultCategoryId] : undefined
    );

    const [updated] = await db
      .update(scheduledArticlesTable)
      .set({
        status: "published",
        publishedUrl: result.url,
        wordpressPostId: result.postId,
      })
      .where(eq(scheduledArticlesTable.id, articleId))
      .returning();

    return NextResponse.json({ article: updated, url: result.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
