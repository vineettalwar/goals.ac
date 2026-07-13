import { pgTable, serial, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export type OrgAuditLogMetadata = Record<string, unknown>;

export const orgAuditLogTable = pgTable("org_audit_log", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  actorUserId: integer("actor_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata").$type<OrgAuditLogMetadata | null>(),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
