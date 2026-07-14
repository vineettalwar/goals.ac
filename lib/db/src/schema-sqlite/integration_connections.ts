import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";

export const integrationConnectionsTable = sqliteTable("integration_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  lastTestedAt: integer("last_tested_at", { mode: "timestamp_ms" }),
  lastTestOk: integer("last_test_ok", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnectionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;
export type IntegrationConnection = typeof integrationConnectionsTable.$inferSelect;
