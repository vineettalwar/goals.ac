import { sqliteTable, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

/** Orgs granted use of the platform Bedrock credential pool (when they lack org BYOK). */
export const platformBedrockOrgGrantsTable = sqliteTable("platform_bedrock_org_grants", {
  organizationId: integer("organization_id")
    .primaryKey()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  grantedBy: integer("granted_by").references(() => usersTable.id, { onDelete: "set null" }),
  grantedAt: integer("granted_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const insertPlatformBedrockOrgGrantSchema = createInsertSchema(
  platformBedrockOrgGrantsTable,
).omit({
  grantedAt: true,
});
export type InsertPlatformBedrockOrgGrant = z.infer<typeof insertPlatformBedrockOrgGrantSchema>;
export type PlatformBedrockOrgGrant = typeof platformBedrockOrgGrantsTable.$inferSelect;
