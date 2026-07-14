import { getToken } from "next-auth/jwt";

export type SessionClaims = {
  id?: string;
  role?: string;
  email?: string;
  organizationId?: number | null;
  orgRole?: string | null;
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
    organizationId: (token.organizationId as number | null) ?? null,
    orgRole: (token.orgRole as string | null) ?? null,
  };
}
