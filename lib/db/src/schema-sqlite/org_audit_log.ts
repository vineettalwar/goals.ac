import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export type OrgAuditLogMetadata = Record<string, unknown>;

export const orgAuditLogTable = sqliteTable("org_audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  actorUserId: integer("actor_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadata: text("metadata", { mode: "json" }).$type<OrgAuditLogMetadata | null>(),
  ip: text("ip"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("org_audit_log_org_id_idx").on(table.organizationId),
  index("org_audit_log_created_at_idx").on(table.createdAt),
]);

export const insertOrgAuditLogSchema = createInsertSchema(orgAuditLogTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrgAuditLog = z.infer<typeof insertOrgAuditLogSchema>;
export type OrgAuditLog = typeof orgAuditLogTable.$inferSelect;
