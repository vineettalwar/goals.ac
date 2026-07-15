import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentPieceMetadata } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner, wordCountFromMarkdown } from "@/lib/content/content-pieces-helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") {
    return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  }
  if (ownerError === "forbidden") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const meta = (piece!.pieceMetadata as ContentPieceMetadata | null) ?? null;
  const snapshot = meta?.preHumanizeBodyMarkdown;
  if (!snapshot) {
    return NextResponse.json({ error: "No humanize snapshot to revert to" }, { status: 400 });
  }

  const { preHumanizeBodyMarkdown: _snapshot, humanizationAudit: _audit, ...restMeta } = meta;
  const nextMeta: ContentPieceMetadata = { ...restMeta, humanized: false };

  const [updated] = await db
    .update(contentPiecesTable)
    .set({
      bodyMarkdown: snapshot,
      wordCount: wordCountFromMarkdown(snapshot),
      pieceMetadata: Object.keys(nextMeta).length > 0 ? nextMeta : null,
      status: "draft",
    })
    .where(eq(contentPiecesTable.id, id))
    .returning();

  return NextResponse.json(updated);
}
