import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const wordpressConnectionsTable = pgTable("wordpress_connections", {
  id: serial("id").primaryKey(),
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
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWordpressConnectionSchema = createInsertSchema(wordpressConnectionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWordpressConnection = z.infer<typeof insertWordpressConnectionSchema>;
export type WordpressConnection = typeof wordpressConnectionsTable.$inferSelect;
