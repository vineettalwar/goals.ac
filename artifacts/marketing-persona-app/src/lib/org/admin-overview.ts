import { getPlatformStats, type PlatformStats } from "@/lib/platform/platform-stats";
import { getPlatformSettings } from "@/lib/platform/platform-settings";
import { listAllUsers, listRecentOrganizations } from "@/lib/org/org-access";

export type AdminAttentionItem = {
  label: string;
  href: string;
  tone: "warning" | "destructive";
};

export type AdminOverviewRecentUser = {
  id: number;
  name: string;
  email: string;
  organizationName: string | null;
  createdAt: string;
  status: "active" | "pending_invite" | "no_org";
};

export type AdminOverviewRecentOrganization = {
  id: number;
  name: string;
  plan: string;
  ownerName: string;
  memberCount: number;
  projectCount: number;
  createdAt: string;
  suspendedAt: string | null;
};

export type AdminOverview = {
  stats: PlatformStats;
  attention: AdminAttentionItem[];
  recentUsers: AdminOverviewRecentUser[];
  recentOrganizations: AdminOverviewRecentOrganization[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const [stats, settings, usersResult, organizations] = await Promise.all([
    getPlatformStats(),
    getPlatformSettings(),
    listAllUsers({ limit: 5 }),
    listRecentOrganizations(5),
  ]);

  const attention: AdminAttentionItem[] = [];

  if (!settings.platformEnabled) {
    attention.push({
      label: "Public access is off — visitors see the maintenance page",
      href: "/admin/platform",
      tone: "warning",
    });
  }
  if (!settings.aiGenerationEnabled) {
    attention.push({
      label: "AI services are paused",
      href: "/admin/platform",
      tone: "warning",
    });
  }
  if (!settings.signupsEnabled) {
    attention.push({
      label: "Public signups are off — invite-only onboarding",
      href: "/admin/platform",
      tone: "warning",
    });
  }
  if (stats.pendingInviteCount > 0) {
    attention.push({
      label: `${stats.pendingInviteCount} pending invite${stats.pendingInviteCount === 1 ? "" : "s"}`,
      href: "/admin/users/invite",
      tone: "warning",
    });
  }
  if (stats.suspendedOrgCount > 0) {
    attention.push({
      label: `${stats.suspendedOrgCount} suspended org${stats.suspendedOrgCount === 1 ? "" : "s"}`,
      href: "/admin/organizations",
      tone: "destructive",
    });
  }

  return {
    stats,
    attention,
    recentUsers: usersResult.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      organizationName: user.organizationName,
      createdAt: user.createdAt.toISOString(),
      status: user.status,
    })),
    recentOrganizations: organizations.map((org) => ({
      id: org.id,
      name: org.name,
      plan: org.plan,
      ownerName: org.ownerName,
      memberCount: org.memberCount,
      projectCount: org.projectCount,
      createdAt: org.createdAt.toISOString(),
      suspendedAt: org.suspendedAt?.toISOString() ?? null,
    })),
  };
}
