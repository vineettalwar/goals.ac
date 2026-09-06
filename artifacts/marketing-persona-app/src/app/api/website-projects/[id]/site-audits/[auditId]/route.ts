import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  db,
  siteAuditsTable,
  siteAuditIssuesTable,
  siteAuditPagesTable,
} from "@workspace/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; auditId: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id, auditId: auditIdRaw } = await params;
  const projectId = Number(id);
  const auditId = Number(auditIdRaw);
  if (Number.isNaN(projectId) || Number.isNaN(auditId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [audit] = await db
    .select()
    .from(siteAuditsTable)
    .where(
      and(
        eq(siteAuditsTable.id, auditId),
        eq(siteAuditsTable.websiteProjectId, projectId),
      ),
    )
    .limit(1);

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  const [issues, pages] = await Promise.all([
    db
      .select()
      .from(siteAuditIssuesTable)
      .where(eq(siteAuditIssuesTable.siteAuditId, auditId)),
    db
      .select()
      .from(siteAuditPagesTable)
      .where(eq(siteAuditPagesTable.siteAuditId, auditId)),
  ]);

  const bySeverity = {
    critical: issues.filter((i) => i.severity === "critical"),
    warning: issues.filter((i) => i.severity === "warning"),
    info: issues.filter((i) => i.severity === "info"),
  };

  return NextResponse.json({ audit, pages, issues, bySeverity });
}
