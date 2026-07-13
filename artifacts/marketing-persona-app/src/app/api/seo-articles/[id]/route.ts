import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { seoArticlesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/require-auth";
import { requireProjectAccess } from "@/lib/org-access";
import { z } from "zod";

const PatchBody = z.object({
  status: z.enum(["draft", "published"]).optional(),
  content: z.string().optional(),
  title: z.string().optional(),
  metaDescription: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });

  try {
    const [article] = await db
      .select()
      .from(seoArticlesTable)
      .where(eq(seoArticlesTable.id, id))
      .limit(1);

    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    if (article.websiteProjectId) {
      const access = await requireProjectAccess(article.websiteProjectId, userId!);
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json(article);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch SEO article" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const [article] = await db
      .select()
      .from(seoArticlesTable)
      .where(eq(seoArticlesTable.id, id))
      .limit(1);

    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    if (article.websiteProjectId) {
      const access = await requireProjectAccess(article.websiteProjectId, userId!);
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.content !== undefined) {
      updates.content = parsed.data.content;
      updates.wordCount = parsed.data.content.split(/\s+/).filter(Boolean).length;
    }
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.metaDescription !== undefined) updates.metaDescription = parsed.data.metaDescription;

    const [updated] = await db
      .update(seoArticlesTable)
      .set(updates)
      .where(eq(seoArticlesTable.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update SEO article" }, { status: 500 });
  }
}
