import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { scheduledArticlesTable, companiesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().optional(),
  bodyMarkdown: z.string().optional(),
  metaDescription: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  status: z.enum(["pending", "generating", "ready", "published", "failed"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const articleId = parseInt(id, 10);

  const [article] = await db
    .select()
    .from(scheduledArticlesTable)
    .innerJoin(companiesTable, eq(companiesTable.id, scheduledArticlesTable.companyId))
    .where(and(eq(scheduledArticlesTable.id, articleId), eq(companiesTable.userId, userId!)))
    .limit(1);

  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ article: article.scheduled_articles });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const articleId = parseInt(id, 10);
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [existing] = await db
    .select({ id: scheduledArticlesTable.id })
    .from(scheduledArticlesTable)
    .innerJoin(companiesTable, eq(companiesTable.id, scheduledArticlesTable.companyId))
    .where(and(eq(scheduledArticlesTable.id, articleId), eq(companiesTable.userId, userId!)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db
    .update(scheduledArticlesTable)
    .set(parsed.data)
    .where(eq(scheduledArticlesTable.id, articleId))
    .returning();

  return NextResponse.json({ article: updated });
}
