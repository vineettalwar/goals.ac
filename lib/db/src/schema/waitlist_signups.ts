import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const waitlistSignupsTable = pgTable(
  "waitlist_signups",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    featureKey: text("feature_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("waitlist_email_feature_idx").on(table.email, table.featureKey)],
);

export const insertWaitlistSignupSchema = createInsertSchema(waitlistSignupsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWaitlistSignup = z.infer<typeof insertWaitlistSignupSchema>;
export type WaitlistSignup = typeof waitlistSignupsTable.$inferSelect;
