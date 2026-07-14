import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertPieceOwner } from "@/lib/content/content-pieces-helpers";
import { requireSiteAdminAccess } from "@/lib/org/org-access";
import { rejectPiece } from "@workspace/content-engine/support/social-queue-service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const id = Number((await params).id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const siteAdmin = await requireSiteAdminAccess(userId!);
  if (!siteAdmin) {
    return NextResponse.json({ error: "Site admin access required to reject" }, { status: 403 });
  }

  const { error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return NextResponse.json({ error: "Content piece not found" }, { status: 404 });
  if (ownerError === "forbidden") return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const updated = await rejectPiece(id);
  return NextResponse.json(updated);
}
