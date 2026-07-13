import { pgTable, serial, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";
import { websiteProjectsTable } from "./website_projects";

/** site_admin = all org sites; member = single assigned site only */
export type OrgMemberRole = "site_admin" | "member";

export const organizationMembersTable = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  /** Required for members; null for site_admin */
  assignedProjectId: integer("assigned_project_id").references(() => websiteProjectsTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("organization_members_org_user_uidx").on(table.organizationId, table.userId),
  index("organization_members_user_id_idx").on(table.userId),
  index("organization_members_assigned_project_id_idx").on(table.assignedProjectId),
]);

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationMember = typeof organizationMembersTable.$inferSelect;
