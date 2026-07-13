import { db } from "@workspace/db";
import { orgAuditLogTable } from "@workspace/db/schema";
import type { OrgAuditLogMetadata } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";

export type OrgAuditAction =
  | "member.added"
  | "member.removed"
  | "member.role_changed"
  | "project.created"
  | "project.deleted"
  | "integration.connected"
  | "integration.disconnected"
  | "content.published"
  | "ai_settings.updated"
  | "org.suspended"
  | "org.unsuspended"
  | "security.updated"
  | "admin.impersonation_started"
  | "admin.impersonation_stopped"
  | "invite.sent"
  | "invite.accepted";

export async function logOrgAudit(input: {
  organizationId: number;
  actorUserId: number | null;
  action: OrgAuditAction;
  resourceType?: string;
  resourceId?: string | number;
  metadata?: OrgAuditLogMetadata;
  ip?: string | null;
}): Promise<void> {
  await db.insert(orgAuditLogTable).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId != null ? String(input.resourceId) : null,
    metadata: input.metadata ?? null,
    ip: input.ip ?? null,
  });
}

export async function listOrgAuditLog(organizationId: number, limit = 50) {
  return db
    .select()
    .from(orgAuditLogTable)
    .where(eq(orgAuditLogTable.organizationId, organizationId))
    .orderBy(desc(orgAuditLogTable.createdAt))
    .limit(limit);
}
