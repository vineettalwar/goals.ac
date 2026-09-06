import { withCors } from "@workspace/cf-edge/cors";
import { isPlatformAdmin } from "@workspace/platform-admin";
import type { SessionClaims } from "@workspace/cf-edge/jwt";
import { forbidden } from "./admin-helpers";
import { handleAdminOrgRoutes } from "./admin-org-routes";
import { handleAdminInviteRoutes } from "./admin-invite-routes";
import { handleAdminIntegrationRoutes } from "./admin-integration-routes";
import { handleAdminImpersonateRoutes } from "./admin-impersonate-routes";

export async function handleAdminWrite(
  request: Request,
  path: string,
  userRole: string | null | undefined,
  session: SessionClaims,
  authSecret: string,
): Promise<Response | null> {
  if (!path.startsWith("/api/admin")) return null;
  if (!isPlatformAdmin(userRole)) return forbidden(request);

  const userId = Number.parseInt(session.id ?? "", 10);
  if (!Number.isFinite(userId)) return forbidden(request);

  return (
    (await handleAdminOrgRoutes(request, path, userId, userRole)) ??
    (await handleAdminInviteRoutes(request, path, userId)) ??
    (await handleAdminIntegrationRoutes(request, path, userId)) ??
    (await handleAdminImpersonateRoutes(request, path, userId, userRole, session, authSecret)) ??
    withCors(request, Response.json({ error: "Not found" }, { status: 404 }))
  );
}
