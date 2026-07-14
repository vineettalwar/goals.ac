import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  contentPiecesTable,
  brandProfilesTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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

  const [project] = await db
    .select()
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, parsed.data.projectId))
    .limit(1);

  const pieces = await db
    .select({
      id: contentPiecesTable.id,
      title: contentPiecesTable.title,
      status: contentPiecesTable.status,
      pieceMetadata: contentPiecesTable.pieceMetadata,
    })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, parsed.data.projectId))
    .limit(50);

  type PageNode = { id: string; title: string; slug: string; inbound: number; outbound: number; status: string };
  const pages: PageNode[] = [];

  for (const piece of pieces) {
    const meta = (piece.pieceMetadata ?? {}) as {
      internalLinkSuggestions?: { suggestedSlug: string }[];
    };
    const outbound = meta.internalLinkSuggestions?.length ?? 0;
    const slug = piece.title.toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    pages.push({
      id: `piece-${piece.id}`,
      title: piece.title,
      slug,
      inbound: 0,
      outbound,
      status: piece.status,
    });
  }

  const slugSet = new Map(pages.map((page) => [page.slug, page]));
  for (const piece of pieces) {
    const meta = (piece.pieceMetadata ?? {}) as {
      internalLinkSuggestions?: { suggestedSlug: string }[];
    };
    for (const link of meta.internalLinkSuggestions ?? []) {
      const normalized = link.suggestedSlug.replace(/^\//, "").split("/").pop() ?? link.suggestedSlug;
      const target =
        slugSet.get(normalized) ??
        [...slugSet.values()].find((page) => link.suggestedSlug.includes(page.slug));
      if (target) target.inbound += 1;
    }
  }

  const orphans = pages.filter((page) => page.inbound === 0 && page.status === "published");
  const suggestions = pieces.flatMap((piece) => {
    const meta = (piece.pieceMetadata ?? {}) as {
      internalLinkSuggestions?: { anchorText: string; suggestedSlug: string; rationale: string }[];
    };
    return (meta.internalLinkSuggestions ?? []).map((suggestion) => ({
      fromTitle: piece.title,
      anchorText: suggestion.anchorText,
      suggestedSlug: suggestion.suggestedSlug,
      rationale: suggestion.rationale,
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
