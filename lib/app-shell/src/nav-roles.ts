export function isSuperAdmin(userRole: string | null | undefined): boolean {
  return userRole === "super_admin" || userRole === "admin";
}

export function isSiteAdmin(orgRole: string | null | undefined): boolean {
  return orgRole === "site_admin" || orgRole === "owner";
}

export function showPartnerNav(
  userRole: string | null | undefined,
  orgRole: string | null | undefined,
): boolean {
  return isSuperAdmin(userRole) || isSiteAdmin(orgRole);
}
