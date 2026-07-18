import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner } from "@/lib/content/content-pieces-helpers";
import { applyStockPhotoToPiece } from "@workspace/content-engine/articles/article-image-enricher";
import { loadStockCredentialContextForProject } from "@workspace/content-engine/support/integrations/stock-credentials";
import { acknowledgeStockPhotoSelection } from "@workspace/stock-images";

const AttachBody = z.object({
  role: z.enum(["featured", "inline"]),
  searchQuery: z.string().trim().max(200).optional(),
  sectionHeading: z.string().trim().max(200).optional(),
  alt: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  /** Editor draft body — prefer over saved body when the user is mid-edit. */
  bodyMarkdown: z.string().max(500_000).optional(),
  photo: z.object({
    provider: z.enum(["unsplash", "pexels"]),
    id: z.string().trim().min(1).max(120),
    url: z.string().url(),
    photographer: z.string().trim().max(200).default(""),
    photographerUrl: z.string().trim().max(500).default(""),
    description: z.string().trim().max(500).optional(),
    rankScore: z.number().optional(),
  }),
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
  const parsed = AttachBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const stockCredentials = await loadStockCredentialContextForProject(piece!.websiteProjectId);

  try {
    await acknowledgeStockPhotoSelection(parsed.data.photo, stockCredentials);
    const enriched = applyStockPhotoToPiece(
      {
        title: piece!.title,
        target_keyword: piece!.targetKeyword ?? piece!.title,
        body_markdown: parsed.data.bodyMarkdown ?? piece!.bodyMarkdown ?? "",
        formatType: piece!.formatType,
        pieceMetadata: piece!.pieceMetadata ?? undefined,
      },
      parsed.data.photo,
      {
        role: parsed.data.role,
        searchQuery: parsed.data.searchQuery,
        sectionHeading: parsed.data.sectionHeading,
        alt: parsed.data.alt,
        title: parsed.data.title,
      },
    );

    const wordCount = enriched.body_markdown.split(/\s+/).filter(Boolean).length;
    const [updated] = await db
      .update(contentPiecesTable)
      .set({
        bodyMarkdown: enriched.body_markdown,
        pieceMetadata: enriched.pieceMetadata,
        wordCount,
      })
      .where(eq(contentPiecesTable.id, id))
      .returning();

    return NextResponse.json({ piece: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to attach stock image";
    const status = /not allowed|must use HTTPS|Invalid stock/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
