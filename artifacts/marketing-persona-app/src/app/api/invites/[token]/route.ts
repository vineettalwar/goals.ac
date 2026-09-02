import { NextResponse } from "next/server";
import { acceptOrgInvite, getInviteByToken } from "@/lib/org/org-access";
import { logOrgAudit } from "@/lib/org/org-audit";
import { requireAuth } from "@/lib/auth/require-auth";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      kind: invite.kind,
      organizationId: invite.organizationId,
      organizationName: invite.organizationName,
      assignedProjectId: invite.assignedProjectId,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      expired: invite.expired,
      revoked: invite.revoked,
    },
  });
}

export async function POST(req: Request, context: RouteContext) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { token } = await context.params;
  const result = await acceptOrgInvite({ token, userId: userId! });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Firm-invite acceptance already logs its own invite.accepted entry inside acceptOrgInvite
  // (the organization doesn't exist until that point, so it can't be logged any earlier).
  if (result.kind === "member") {
    await logOrgAudit({
      organizationId: result.organizationId,
      actorUserId: userId,
      action: "invite.accepted",
      resourceType: "user",
      resourceId: userId,
      metadata: { token },
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    });
  }

  return NextResponse.json({ ok: true, organizationId: result.organizationId, kind: result.kind });
}
