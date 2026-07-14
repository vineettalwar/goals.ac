import { z } from "zod";

export const OrgMemberRoleSchema = z.enum(["owner", "site_admin", "editor", "viewer"]);
export type OrgMemberRole = z.infer<typeof OrgMemberRoleSchema>;

/** Normalize legacy member role from JWT/DB */
export function normalizeOrgRole(role: string | null | undefined): OrgMemberRole | null {
  if (!role) return null;
  if (role === "member") return "editor";
  const parsed = OrgMemberRoleSchema.safeParse(role);
  return parsed.success ? parsed.data : null;
}

export const OrgPermission = {
  PROJECT_READ: "project:read",
  PROJECT_WRITE: "project:write",
  CONTENT_READ: "content:read",
  CONTENT_WRITE: "content:write",
  CONTENT_PUBLISH: "content:publish",
  TEAM_MANAGE: "team:manage",
  INTEGRATIONS_MANAGE: "integrations:manage",
  INTEGRATIONS_VIEW: "integrations:view",
  AI_SETTINGS_MANAGE: "ai_settings:manage",
  BILLING_MANAGE: "billing:manage",
  BILLING_VIEW: "billing:view",
} as const;

export type OrgPermission = (typeof OrgPermission)[keyof typeof OrgPermission];

const ROLE_PERMISSIONS: Record<OrgMemberRole, OrgPermission[]> = {
  owner: Object.values(OrgPermission),
  site_admin: [
    OrgPermission.PROJECT_READ,
    OrgPermission.PROJECT_WRITE,
    OrgPermission.CONTENT_READ,
    OrgPermission.CONTENT_WRITE,
    OrgPermission.CONTENT_PUBLISH,
    OrgPermission.TEAM_MANAGE,
    OrgPermission.INTEGRATIONS_MANAGE,
    OrgPermission.INTEGRATIONS_VIEW,
    OrgPermission.AI_SETTINGS_MANAGE,
    OrgPermission.BILLING_VIEW,
  ],
  editor: [
    OrgPermission.PROJECT_READ,
    OrgPermission.CONTENT_READ,
    OrgPermission.CONTENT_WRITE,
    OrgPermission.CONTENT_PUBLISH,
    OrgPermission.INTEGRATIONS_VIEW,
  ],
  viewer: [
    OrgPermission.PROJECT_READ,
    OrgPermission.CONTENT_READ,
    OrgPermission.INTEGRATIONS_VIEW,
  ],
};

export function isSuperAdmin(userRole: string | null | undefined): boolean {
  return userRole === "super_admin" || userRole === "admin";
}

export function isSiteAdmin(orgRole: OrgMemberRole | null | undefined): boolean {
  return orgRole === "site_admin" || orgRole === "owner";
}

export function hasOrgPermission(
  orgRole: OrgMemberRole | null | undefined,
  permission: OrgPermission,
): boolean {
  if (!orgRole) return false;
  return ROLE_PERMISSIONS[orgRole]?.includes(permission) ?? false;
}
