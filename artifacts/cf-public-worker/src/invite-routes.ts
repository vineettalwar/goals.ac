import { withCors } from "@workspace/cf-edge/cors";
import { getInviteByToken } from "@workspace/platform-admin";

export async function handlePublicInviteGet(request: Request, path: string): Promise<Response | null> {
  const match = path.match(/^\/api\/invites\/([^/]+)$/);
  if (!match || request.method !== "GET") return null;

  const token = decodeURIComponent(match[1] ?? "");
  const invite = await getInviteByToken(token);

  if (!invite) {
    return withCors(request, Response.json({ error: "Invite not found" }, { status: 404 }));
  }

  return withCors(
    request,
    Response.json({
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
    }),
  );
}
