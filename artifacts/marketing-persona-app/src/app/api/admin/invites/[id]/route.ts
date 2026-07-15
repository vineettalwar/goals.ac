import { NextResponse } from "next/server";
import { revokeOrgInvite } from "@/lib/org/org-access";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const inviteId = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(inviteId) || inviteId <= 0) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }

  const result = await revokeOrgInvite(inviteId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ revoked: true });
}
