import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner } from "@/lib/content/content-pieces-helpers";
import { listContentPieceVersions } from "@workspace/content-engine/content-piece-versions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const versions = await listContentPieceVersions(id);
  return NextResponse.json(versions);
}
