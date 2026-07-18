import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner } from "@/lib/content/content-pieces-helpers";
import { parseImageSettings } from "@workspace/content-engine/articles/article-image-enricher";
import { loadStockCredentialContextForProject } from "@workspace/content-engine/support/integrations/stock-credentials";
import { rankStockPhotos, searchStockPhotos } from "@workspace/stock-images";
import type { ContentStyle } from "@workspace/db/schema/website_projects";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || piece!.targetKeyword?.trim() || piece!.title;
  if (!q) return NextResponse.json({ error: "Query required" }, { status: 400 });

  const [project] = await db
    .select({ contentStyle: websiteProjectsTable.contentStyle })
    .from(websiteProjectsTable)
    .where(eq(websiteProjectsTable.id, piece!.websiteProjectId))
    .limit(1);

  const settings = parseImageSettings(project?.contentStyle as ContentStyle | null);
  const stockCredentials = await loadStockCredentialContextForProject(piece!.websiteProjectId);

  try {
    const photos = await searchStockPhotos(q, {
      provider: settings.stockProvider ?? "auto",
      orientation: "landscape",
      perPage: 18,
      credentials: stockCredentials,
    });
    const ranked = rankStockPhotos(q, photos, { orientation: "landscape" });
    return NextResponse.json({
      query: q,
      photos: ranked.map((photo) => ({
        provider: photo.provider,
        id: photo.id,
        url: photo.url,
        previewUrl: photo.previewUrl,
        width: photo.width,
        height: photo.height,
        photographer: photo.photographer,
        photographerUrl: photo.photographerUrl,
        description: photo.description,
        rankScore: photo.rankScore,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stock search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
