import { pgTable, serial, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { websiteProjectsTable } from "./website_projects";

export const orgInvitesTable = pgTable("org_invites", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("editor"),
  assignedProjectId: integer("assigned_project_id").references(() => websiteProjectsTable.id, {
    onDelete: "set null",
  }),
  token: text("token").notNull(),
  invitedByUserId: integer("invited_by_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("org_invites_token_uidx").on(table.token),
  index("org_invites_org_id_idx").on(table.organizationId),
  index("org_invites_email_idx").on(table.email),
]);

export const insertOrgInviteSchema = createInsertSchema(orgInvitesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrgInvite = z.infer<typeof insertOrgInviteSchema>;
export type OrgInvite = typeof orgInvitesTable.$inferSelect;
