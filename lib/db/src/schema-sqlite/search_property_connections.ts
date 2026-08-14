import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";

export const SEARCH_PROPERTY_PROVIDERS = ["google_search_console", "bing_webmaster"] as const;
export type SearchPropertyProvider = (typeof SEARCH_PROPERTY_PROVIDERS)[number];

export const searchPropertyConnectionsTable = sqliteTable(
  "search_property_connections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().$type<SearchPropertyProvider>(),
    /** GSC site URL (https://example.com/) or sc-domain:example.com; Bing site URL */
    propertyUrl: text("property_url"),
    accountEmail: text("account_email"),
    encryptedTokens: text("encrypted_tokens").notNull(),
    propertyVerified: integer("property_verified", { mode: "boolean" }).notNull().default(false),
    /** Set on every sync attempt. Null means never synced since connecting. */
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
    /** ok | auth_error | error. auth_error means the token was rejected — reconnecting fixes it, retrying will not. */
    lastSyncStatus: text("last_sync_status").$type<"ok" | "auth_error" | "error">(),
    /** Short, user-facing reason for the last failure. Null when lastSyncStatus is "ok". */
    lastSyncError: text("last_sync_error"),
    connectedAt: integer("connected_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  },
  (table) => [uniqueIndex("search_property_connections_project_provider_idx").on(table.projectId, table.provider)],
);

export const insertSearchPropertyConnectionSchema = createInsertSchema(searchPropertyConnectionsTable).omit({
  id: true,
  connectedAt: true,
  updatedAt: true,
});
export type InsertSearchPropertyConnection = z.infer<typeof insertSearchPropertyConnectionSchema>;
export type SearchPropertyConnection = typeof searchPropertyConnectionsTable.$inferSelect;
