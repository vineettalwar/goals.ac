import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { companiesTable } from "./companies";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** starter | growth | scale — billing tier for site limits and quotas */
  plan: text("plan").notNull().default("starter"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  encryptedGeminiKey: text("encrypted_gemini_key"),
  /** gemini | ollama — in-app preference; env AI_PROVIDER is fallback */
  aiProvider: text("ai_provider"),
  ollamaBaseUrl: text("ollama_base_url"),
  ollamaModel: text("ollama_model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("organizations_owner_id_idx").on(table.ownerId),
  index("organizations_company_id_idx").on(table.companyId),
]);

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
