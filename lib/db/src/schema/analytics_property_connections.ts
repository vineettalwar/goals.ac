import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";

export const ANALYTICS_PROPERTY_PROVIDERS = ["google_analytics_4"] as const;
export type AnalyticsPropertyProvider = (typeof ANALYTICS_PROPERTY_PROVIDERS)[number];

export const analyticsPropertyConnectionsTable = pgTable(
  "analytics_property_connections",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().$type<AnalyticsPropertyProvider>(),
    /** GA4 property resource name, e.g. properties/123456789 */
    propertyId: text("property_id").notNull(),
    propertyName: text("property_name"),
    /** GA4 data stream ID, e.g. properties/123456789/dataStreams/987654321 */
    streamId: text("stream_id"),
    accountEmail: text("account_email"),
    encryptedTokens: text("encrypted_tokens").notNull(),
    propertyVerified: boolean("property_verified").notNull().default(false),
    /** Set on every sync attempt. Null means never synced since connecting. */
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    /** ok | auth_error | error. auth_error means the token was rejected — reconnecting fixes it, retrying will not. */
    lastSyncStatus: text("last_sync_status").$type<"ok" | "auth_error" | "error">(),
    /** Short, user-facing reason for the last failure. Null when lastSyncStatus is "ok". */
    lastSyncError: text("last_sync_error"),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("analytics_property_connections_project_provider_idx").on(table.projectId, table.provider)],
);

export const insertAnalyticsPropertyConnectionSchema = createInsertSchema(analyticsPropertyConnectionsTable).omit({
  id: true,
  connectedAt: true,
  updatedAt: true,
});
export type InsertAnalyticsPropertyConnection = z.infer<typeof insertAnalyticsPropertyConnectionSchema>;
export type AnalyticsPropertyConnection = typeof analyticsPropertyConnectionsTable.$inferSelect;
