import { getToken } from "next-auth/jwt";

export type SessionClaims = {
  id?: string;
  role?: string;
  email?: string;
  name?: string | null;
  organizationId?: number | null;
  orgRole?: string | null;
  impersonatorId?: string;
  impersonatorRole?: string;
  impersonatorEmail?: string | null;
  impersonatorName?: string | null;
  supportOrganizationId?: number | null;
  supportOrganizationName?: string | null;
};

/** Verify NextAuth JWT from request cookie (requires AUTH_SECRET + nodejs_compat). */
export async function verifySessionClaims(
  request: Request,
  secret: string,
): Promise<SessionClaims | null> {
  const token = await getToken({
    req: request as unknown as Parameters<typeof getToken>[0]["req"],
    secret,
    secureCookie: request.url.startsWith("https://"),
  });
  if (!token) return null;
  return {
    id: token.id as string | undefined,
    role: token.role as string | undefined,
    email: token.email as string | undefined,
    name: (token.name as string | null) ?? null,
    organizationId: (token.organizationId as number | null) ?? null,
    orgRole: (token.orgRole as string | null) ?? null,
    impersonatorId: token.impersonatorId as string | undefined,
    impersonatorRole: token.impersonatorRole as string | undefined,
    impersonatorEmail: (token.impersonatorEmail as string | null) ?? null,
    impersonatorName: (token.impersonatorName as string | null) ?? null,
    supportOrganizationId: (token.supportOrganizationId as number | null) ?? null,
    supportOrganizationName: (token.supportOrganizationName as string | null) ?? null,
  };
}
