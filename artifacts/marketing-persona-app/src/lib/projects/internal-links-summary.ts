import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { countInternalLinks } from "@workspace/content-engine/content/content-piece-seo";

export type ProjectInternalLinkSummary = {
  coverageScore: number;
  pageCount: number;
  orphanCount: number;
  suggestionCount: number;
  appliedInternalLinks: number;
};

export async function getProjectInternalLinkSummary(
  projectId: number,
): Promise<ProjectInternalLinkSummary> {
  const pieces = await db
    .select({
      title: contentPiecesTable.title,
      status: contentPiecesTable.status,
      bodyMarkdown: contentPiecesTable.bodyMarkdown,
      pieceMetadata: contentPiecesTable.pieceMetadata,
    })
    .from(contentPiecesTable)
    .where(eq(contentPiecesTable.websiteProjectId, projectId))
    .limit(50);

  type PageNode = { slug: string; inbound: number; status: string };
  const pages: PageNode[] = [];

  for (const piece of pieces) {
    const meta = (piece.pieceMetadata ?? {}) as {
      internalLinkSuggestions?: { suggestedSlug: string }[];
    };
    const slug = piece.title.toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    pages.push({
      slug,
      inbound: 0,
      status: piece.status,
    });
  }

  const slugSet = new Map(pages.map((page) => [page.slug, page]));
  let suggestionCount = 0;

  for (const piece of pieces) {
    const meta = (piece.pieceMetadata ?? {}) as {
      internalLinkSuggestions?: { suggestedSlug: string }[];
    };
    suggestionCount += meta.internalLinkSuggestions?.length ?? 0;
    for (const link of meta.internalLinkSuggestions ?? []) {
      const normalized = link.suggestedSlug.replace(/^\//, "").split("/").pop() ?? link.suggestedSlug;
      const target =
        slugSet.get(normalized) ??
        [...slugSet.values()].find((page) => link.suggestedSlug.includes(page.slug));
      if (target) target.inbound += 1;
    }
  }

  const orphans = pages.filter((page) => page.inbound === 0 && page.status === "published");
  const coverageScore =
    pages.length === 0 ? 0 : Math.round(((pages.length - orphans.length) / pages.length) * 100);

  const appliedInternalLinks = pieces.reduce(
    (sum, piece) => sum + countInternalLinks(piece.bodyMarkdown ?? ""),
    0,
  );

  return {
    coverageScore,
    pageCount: pages.length,
    orphanCount: orphans.length,
    suggestionCount,
    appliedInternalLinks,
  };
}
