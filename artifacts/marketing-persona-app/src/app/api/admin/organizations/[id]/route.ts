import { NextResponse } from "next/server";
import { getOrganizationAdminDetail } from "@/lib/org/org-access";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const { id: idStr } = await params;
  const organizationId = Number.parseInt(idStr, 10);
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
  }

  const detail = await getOrganizationAdminDetail(organizationId);
  if (!detail) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    organization: {
      ...detail.organization,
      createdAt: detail.organization.createdAt.toISOString(),
      suspendedAt: detail.organization.suspendedAt?.toISOString() ?? null,
      currentPeriodEnd: detail.organization.currentPeriodEnd?.toISOString() ?? null,
    },
    projects: detail.projects.map((project) => ({
      ...project,
      createdAt: project.createdAt.toISOString(),
    })),
    auditLog: detail.auditLog.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}
