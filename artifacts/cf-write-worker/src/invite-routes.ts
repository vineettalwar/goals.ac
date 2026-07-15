import { withCors } from "@workspace/cf-edge/cors";
import { acceptOrgInvite, logOrgAudit } from "@workspace/platform-admin";

function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function handleInviteAcceptPost(
  request: Request,
  path: string,
  userId: number,
): Promise<Response | null> {
  const match = path.match(/^\/api\/invites\/([^/]+)$/);
  if (!match || request.method !== "POST") return null;

  const token = decodeURIComponent(match[1] ?? "");
  const result = await acceptOrgInvite({ token, userId });

  if (!result.ok) {
    return withCors(request, Response.json({ error: result.error }, { status: 400 }));
  }

  await logOrgAudit({
    organizationId: result.organizationId,
    actorUserId: userId,
    action: "invite.accepted",
    resourceType: "user",
    resourceId: userId,
    metadata: { token },
    ip: clientIp(request),
  });

  return withCors(request, Response.json({ ok: true, organizationId: result.organizationId }));
}
