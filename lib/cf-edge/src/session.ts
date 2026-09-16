import { getDb } from "@workspace/db";
import type { GoalsD1Database } from "@workspace/db/d1";
import { usersTable } from "@workspace/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { verifySessionClaims, type SessionClaims } from "./jwt";
import {
  assertIpAllowed,
  assertMfaCompliance,
  clientIpFromRequest,
  isWorkerMfaExemptPath,
  sessionExpired,
} from "./org-security";
import { assertOrgNotSuspended, getOrgMembership } from "./project-access";

function db(): GoalsD1Database {
  return getDb() as GoalsD1Database;
}

export type WorkerSessionOk = {
  ok: true;
  session: SessionClaims;
  userId: number;
};

export type WorkerSessionFail = {
  ok: false;
  status: number;
  error: string;
  code?: string;
};

export async function requireWorkerSession(
  request: Request,
  secret: string,
  options?: { skipMfaCheck?: boolean; path?: string; method?: string },
): Promise<WorkerSessionOk | WorkerSessionFail> {
  const session = await verifySessionClaims(request, secret);
  if (!session?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const userId = Number.parseInt(session.id, 10);
  if (!Number.isFinite(userId)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const suspended = await assertOrgNotSuspended(userId);
  if (!suspended.ok) {
    return { ok: false, status: suspended.status, error: suspended.error };
  }

  const membership = await getOrgMembership(userId);
  if (membership) {
    const ipCheck = assertIpAllowed(
      clientIpFromRequest(request),
      membership.securitySettings?.allowedIps,
    );
    if (!ipCheck.ok) {
      return { ok: false, status: 403, error: ipCheck.error };
    }

    if (sessionExpired(session.iat, membership.securitySettings?.maxSessionAgeHours)) {
      return { ok: false, status: 401, error: "Session expired" };
    }

    const path = options?.path ?? ((new URL(request.url).pathname.replace(/\/+$/, "") || "/"));
    const method = options?.method ?? request.method;
    const skipMfa =
      options?.skipMfaCheck === true || isWorkerMfaExemptPath(path, method);

    if (!skipMfa) {
      const [user] = await db()
        .select({ mfaEnabled: usersTable.mfaEnabled })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      const mfaCheck = assertMfaCompliance({
        requireMfa: membership.securitySettings?.requireMfa,
        userMfaEnabled: Boolean(user?.mfaEnabled),
        sessionMfaVerified: Boolean(session.mfaVerified),
      });
      if (!mfaCheck.ok) {
        return {
          ok: false,
          status: 403,
          error: mfaCheck.error,
          code: mfaCheck.code,
        };
      }
    }
  }

  return { ok: true, session, userId };
}

export function workerSessionErrorBody(result: WorkerSessionFail): Record<string, string> {
  if (result.code) {
    return { error: result.code, message: result.error };
  }
  return { error: result.error };
}
