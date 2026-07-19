import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { isSiteAdmin, isSuperAdmin } from "@/lib/org/org-access";
import { getSupportOrganizationId } from "@/lib/org/project-scope";
import { loadPartnerReport } from "@/lib/org/partner-report";

export async function GET() {
  const { session, userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `partner-projects:user:${userId}`,
    RATE_LIMITS.PARTNER_PROJECTS_PER_USER.limit,
    RATE_LIMITS.PARTNER_PROJECTS_PER_USER.windowMs,
  );
  if (limited) return limited;

  const supportOrganizationId = getSupportOrganizationId(session!);
  const canAccess =
    isSuperAdmin(session!.user.role) ||
    isSiteAdmin(session!.user.orgRole) ||
    supportOrganizationId != null;

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await loadPartnerReport(userId!, supportOrganizationId);
  return NextResponse.json({
    organizationName: report.organizationName,
    generatedAt: report.generatedAt,
    projects: report.projects,
  });
}
