import { NextResponse } from "next/server";
import { z } from "zod";
import type { OrgSecuritySettings } from "@workspace/db/schema";
import { requireSiteAdminAccess, updateOrgSecuritySettings } from "@/lib/org/org-access";
import { requireAuth } from "@/lib/auth/require-auth";
import { logOrgAudit } from "@/lib/org/org-audit";

const securitySchema = z.object({
  requireMfa: z.boolean().optional(),
  allowedIps: z.array(z.string()).optional(),
  maxSessionAgeHours: z.number().int().positive().max(720).optional(),
  allowCrossProjectEditors: z.boolean().optional(),
  ssoConfig: z
    .object({
      provider: z.string().optional(),
      issuer: z.string().optional(),
      clientId: z.string().optional(),
      domain: z.string().optional(),
    })
    .optional(),
});

export async function GET() {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const siteAdmin = await requireSiteAdminAccess(userId!);
  if (!siteAdmin.ok) {
    return NextResponse.json({ error: siteAdmin.error }, { status: siteAdmin.status });
  }

  return NextResponse.json({
    securitySettings: siteAdmin.membership.securitySettings ?? {},
  });
}

export async function PATCH(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const siteAdmin = await requireSiteAdminAccess(userId!);
  if (!siteAdmin.ok) {
    return NextResponse.json({ error: siteAdmin.error }, { status: siteAdmin.status });
  }

  const organizationId = siteAdmin.membership.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = securitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const next: OrgSecuritySettings = {
    ...(siteAdmin.membership.securitySettings ?? {}),
    ...parsed.data,
  };

  await updateOrgSecuritySettings(organizationId, next);

  await logOrgAudit({
    organizationId,
    actorUserId: userId,
    action: "security.updated",
    metadata: parsed.data as Record<string, unknown>,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  return NextResponse.json({ securitySettings: next });
}
