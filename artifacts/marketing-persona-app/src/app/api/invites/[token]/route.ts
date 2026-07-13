import { NextResponse } from "next/server";
import { acceptOrgInvite, getInviteByToken } from "@/lib/org-access";
import { logOrgAudit } from "@/lib/org-audit";
import { requireAuth } from "@/lib/require-auth";

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
      organizationId: invite.organizationId,
      organizationName: invite.organizationName,
      assignedProjectId: invite.assignedProjectId,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      expired: invite.expired,
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

  await logOrgAudit({
    organizationId: result.organizationId,
    actorUserId: userId,
    action: "invite.accepted",
    resourceType: "user",
    resourceId: userId,
    metadata: { token },
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  });

  return NextResponse.json({ ok: true, organizationId: result.organizationId });
}
