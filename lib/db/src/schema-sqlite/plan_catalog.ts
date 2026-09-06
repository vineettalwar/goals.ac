import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * Commercial identity of a sellable plan — label, price, Stripe price id, monthly credit grant.
 * Deliberately separate from `plan_quota_config` (which owns per-plan usage limits and changes on a
 * different cadence). `id` is the plan slug used everywhere else as `organizations.plan` / `users.plan` /
 * `plan_quota_config.plan_id` — text, not an enum, so a new tier is an INSERT, not a migration.
 */
export const planCatalogTable = sqliteTable("plan_catalog", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  /** Minor units (cents). 0 for the free plan. */
  priceAmount: integer("price_amount").notNull().default(0),
  /** ISO 4217, lowercase, matching Stripe's convention (e.g. "eur"). */
  currency: text("currency").notNull().default("eur"),
  stripePriceId: text("stripe_price_id"),
  /** Monthly platform-key credit grant on Stripe renewal. null = no grant. */
  monthlyCredits: integer("monthly_credits"),
  /** Self-serve purchasable from the public pricing page / checkout. */
  isOffered: integer("is_offered", { mode: "boolean" }).notNull().default(false),
  /** false = fully retired/hidden; existing orgs on it still resolve fine. */
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedBy: integer("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export const insertPlanCatalogSchema = createInsertSchema(planCatalogTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPlanCatalogEntry = z.infer<typeof insertPlanCatalogSchema>;
export type PlanCatalogRow = typeof planCatalogTable.$inferSelect;
