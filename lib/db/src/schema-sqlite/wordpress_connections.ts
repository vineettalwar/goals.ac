import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const wordpressConnectionsTable = sqliteTable("wordpress_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .unique()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  siteUrl: text("site_url").notNull(),
  username: text("username").notNull(),
  encryptedAppPassword: text("encrypted_app_password").notNull(),
  defaultCategoryId: integer("default_category_id"),
  // draft | publish
  defaultStatus: text("default_status").notNull().default("draft"),
  lastTestedAt: integer("last_tested_at", { mode: "timestamp_ms" }),
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export const insertWordpressConnectionSchema = createInsertSchema(wordpressConnectionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWordpressConnection = z.infer<typeof insertWordpressConnectionSchema>;
export type WordpressConnection = typeof wordpressConnectionsTable.$inferSelect;
