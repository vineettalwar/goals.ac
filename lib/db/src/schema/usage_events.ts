import { pgTable, serial, text, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { companiesTable } from "./companies";

// eventType examples: 'article_generation' | 'humanization' | 'persona_generation'
export const usageEventsTable = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
  usedByok: boolean("used_byok").notNull().default(false),
  // strategy | planning | execution | rapid
  tier: text("tier"),
  // anthropic | gemini | openai
  provider: text("provider"),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUsageEventSchema = createInsertSchema(usageEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUsageEvent = z.infer<typeof insertUsageEventSchema>;
export type UsageEvent = typeof usageEventsTable.$inferSelect;
