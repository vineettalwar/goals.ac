import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { websiteProjectsTable } from "./website_projects";

export const SEARCH_PROPERTY_PROVIDERS = ["google_search_console", "bing_webmaster"] as const;
export type SearchPropertyProvider = (typeof SEARCH_PROPERTY_PROVIDERS)[number];

export const searchPropertyConnectionsTable = pgTable(
  "search_property_connections",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().$type<SearchPropertyProvider>(),
    /** GSC site URL (https://example.com/) or sc-domain:example.com; Bing site URL */
    propertyUrl: text("property_url"),
    accountEmail: text("account_email"),
    encryptedTokens: text("encrypted_tokens").notNull(),
    propertyVerified: boolean("property_verified").notNull().default(false),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
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
