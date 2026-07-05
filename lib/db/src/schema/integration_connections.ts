import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const integrationConnectionsTable = pgTable("integration_connections", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  // ghost | webhook
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  // Ghost: the Admin API URL (e.g. https://example.ghost.io). Webhook: the target URL to POST to.
  url: text("url"),
  // Ghost: encrypted "id:secret" admin API key. Webhook: encrypted HMAC signing secret.
  encryptedSecret: text("encrypted_secret").notNull(),
  // draft | publish
  defaultStatus: text("default_status").notNull().default("draft"),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastTestOk: boolean("last_test_ok").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnectionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;
export type IntegrationConnection = typeof integrationConnectionsTable.$inferSelect;
