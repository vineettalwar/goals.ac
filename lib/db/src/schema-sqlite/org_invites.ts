import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";
import { websiteProjectsTable } from "./website_projects";

/**
 * `member` — joins an organization that already exists (the original behavior).
 * `firm`   — onboards a brand-new firm; no organization exists yet, so the row is
 *            created when the invite is accepted (organizations.owner_id is NOT NULL,
 *            so the org cannot exist before its owner user does).
 */
export type OrgInviteKind = "member" | "firm";

/** Business vertical — drives onboarding presets, tone guardrails, and review gating. */
export type OrgVertical = "law" | "dental" | "software" | "marketing" | "other";

/**
 * What the super admin already knew at invite time. Anything left undefined is asked
 * during onboarding instead; anything present auto-advances its step.
 */
export type OrgInvitePrefill = {
  orgName?: string;
  vertical?: OrgVertical;
  websiteUrl?: string;
  plan?: string;
  contactName?: string;
};

export const orgInvitesTable = sqliteTable("org_invites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Null for `firm` invites — the organization is created at acceptance. */
  organizationId: integer("organization_id").references(() => organizationsTable.id, {
    onDelete: "cascade",
  }),
  email: text("email").notNull(),
  role: text("role").notNull().default("editor"),
  kind: text("kind").notNull().default("member").$type<OrgInviteKind>(),
  prefill: text("prefill", { mode: "json" }).$type<OrgInvitePrefill | null>(),
  assignedProjectId: integer("assigned_project_id").references(() => websiteProjectsTable.id, {
    onDelete: "set null",
  }),
  /**
   * Legacy plaintext token. Retained nullable so existing rows keep working during
   * rollout; new rows write null here and store only `tokenHash`.
   */
  token: text("token"),
  /** SHA-256 of the emailed token. Lookups go through this, never the plaintext. */
  tokenHash: text("token_hash"),
  invitedByUserId: integer("invited_by_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  lastSentAt: integer("last_sent_at", { mode: "timestamp_ms" }),
  sendCount: integer("send_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("org_invites_token_uidx").on(table.token),
  uniqueIndex("org_invites_token_hash_uidx").on(table.tokenHash),
  index("org_invites_org_id_idx").on(table.organizationId),
  index("org_invites_email_idx").on(table.email),
  index("org_invites_kind_idx").on(table.kind),
]);

export const insertOrgInviteSchema = createInsertSchema(orgInvitesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOrgInvite = z.infer<typeof insertOrgInviteSchema>;
export type OrgInvite = typeof orgInvitesTable.$inferSelect;
