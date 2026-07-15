export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === "super_admin" || role === "admin";
}
