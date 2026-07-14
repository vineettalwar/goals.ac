import type { Session } from "next-auth";

export function getSupportOrganizationId(
  session: Pick<Session, "supportOrganization"> | null | undefined,
): number | null {
  return session?.supportOrganization?.id ?? null;
}
