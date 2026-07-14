import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  scheduledArticlesTable,
  contentPiecesTable,
  brandProfilesTable,
  companiesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { z } from "zod";

const Query = z.object({ projectId: z.coerce.number().int().positive() });

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = Query.safeParse({ projectId: url.searchParams.get("projectId") });
  if (!parsed.success) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const access = await requireProjectAccess(parsed.data.projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId!))
    .limit(1);

  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, parsed.data.projectId))
    .limit(1);

  const articles = company
    ? await db
        .select({
          id: scheduledArticlesTable.id,
          title: scheduledArticlesTable.title,
          status: scheduledArticlesTable.status,
          metadata: scheduledArticlesTable.articleMetadata,
        })
        .from(scheduledArticlesTable)
        .where(eq(scheduledArticlesTable.companyId, company.id))
        .limit(50)
    : [];

  const pieces = await db
    .select({ id: contentPiecesTable.id, title: contentPiecesTable.title, status: contentPiecesTable.status })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, parsed.data.projectId))
    .limit(50);

  type PageNode = { id: string; title: string; slug: string; inbound: number; outbound: number; status: string };
  const pages: PageNode[] = [];

  for (const a of articles) {
    const meta = (a.metadata ?? {}) as { internalLinkSuggestions?: { suggestedSlug: string }[] };
    const outbound = meta.internalLinkSuggestions?.length ?? 0;
    const slug = (a.title ?? "article").toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    pages.push({ id: `article-${a.id}`, title: a.title ?? "Untitled", slug, inbound: 0, outbound, status: a.status });
  }

  for (const p of pieces) {
    const slug = p.title.toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    pages.push({ id: `piece-${p.id}`, title: p.title, slug, inbound: 0, outbound: 0, status: p.status });
  }

  const slugSet = new Map(pages.map((p) => [p.slug, p]));
  for (const a of articles) {
    const meta = (a.metadata ?? {}) as { internalLinkSuggestions?: { suggestedSlug: string }[] };
    for (const link of meta.internalLinkSuggestions ?? []) {
      const normalized = link.suggestedSlug.replace(/^\//, "").split("/").pop() ?? link.suggestedSlug;
      const target = slugSet.get(normalized) ?? [...slugSet.values()].find((p) => link.suggestedSlug.includes(p.slug));
      if (target) target.inbound += 1;
    }
  }

  const orphans = pages.filter((p) => p.inbound === 0 && p.status === "published");
  const suggestions = articles.flatMap((a) => {
    const meta = (a.metadata ?? {}) as {
      internalLinkSuggestions?: { anchorText: string; suggestedSlug: string; rationale: string }[];
    };
    return (meta.internalLinkSuggestions ?? []).map((s) => ({
      fromTitle: a.title,
      anchorText: s.anchorText,
      suggestedSlug: s.suggestedSlug,
      rationale: s.rationale,
    }));
  });

  const coverageScore =
    pages.length === 0 ? 0 : Math.round(((pages.length - orphans.length) / pages.length) * 100);

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.websiteProjectId, parsed.data.projectId))
    .limit(1);

  return NextResponse.json({
    projectUrl: project?.url,
    coverageScore,
    pageCount: pages.length,
    orphanCount: orphans.length,
    pages,
    orphans,
    suggestions: suggestions.slice(0, 20),
    brandKeywords: brand?.primaryKeywords ?? [],
  });
}
