import { encode } from "next-auth/jwt";

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export type SessionTokenPayload = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organizationId?: number | null;
  orgRole?: string | null;
  impersonatorId?: string;
  impersonatorRole?: string;
  impersonatorEmail?: string | null;
  impersonatorName?: string | null;
  supportOrganizationId?: number | null;
  supportOrganizationName?: string | null;
};

function sessionCookieName(secure: boolean): string {
  return secure ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export async function buildSessionCookie(
  payload: SessionTokenPayload,
  secret: string,
  secure: boolean,
): Promise<string> {
  const name = sessionCookieName(secure);
  const value = await encode({
    token: {
      sub: payload.id,
      id: payload.id,
      email: payload.email,
      name: payload.name ?? undefined,
      role: payload.role,
      organizationId: payload.organizationId ?? undefined,
      orgRole: payload.orgRole ?? undefined,
      impersonatorId: payload.impersonatorId,
      impersonatorRole: payload.impersonatorRole,
      impersonatorEmail: payload.impersonatorEmail ?? undefined,
      impersonatorName: payload.impersonatorName ?? undefined,
      supportOrganizationId: payload.supportOrganizationId ?? undefined,
      supportOrganizationName: payload.supportOrganizationName ?? undefined,
    },
    secret,
    salt: name,
    maxAge: SESSION_MAX_AGE_SEC,
  });
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  const name = sessionCookieName(secure);
  const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function requestUsesSecureCookies(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}
