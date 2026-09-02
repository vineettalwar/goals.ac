import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { acceptOrgInvite } from "@/lib/org/org-access";
import { logOrgAudit } from "@/lib/org/org-audit";
import { requireAuth } from "@/lib/auth/require-auth";
import { INVITE_TOKEN_COOKIE } from "@/app/api/invites/invite-cookie";

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const cookieStore = await cookies();
  const token = cookieStore.get(INVITE_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "No invite found" }, { status: 404 });
  }

  const result = await acceptOrgInvite({ token, userId: userId! });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Firm-invite acceptance logs its own invite.accepted entry inside acceptOrgInvite, once the
  // organization exists — org_audit_log requires an organization_id, which a firm invite doesn't
  // have until this point.
  if (result.kind === "member") {
    await logOrgAudit({
      organizationId: result.organizationId,
      actorUserId: userId,
      action: "invite.accepted",
      resourceType: "user",
      resourceId: userId,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    });
  }

  cookieStore.delete(INVITE_TOKEN_COOKIE);

  return NextResponse.json({
    ok: true,
    organizationId: result.organizationId,
    kind: result.kind,
    redirectTo: result.kind === "firm" ? "/onboarding" : "/dashboard",
  });
}
