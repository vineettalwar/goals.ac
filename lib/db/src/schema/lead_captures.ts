import { pgTable, serial, text, timestamp, boolean, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roadmapsTable } from "./roadmaps";

export const leadCapturesTable = pgTable(
  "lead_captures",
  {
    id: serial("id").primaryKey(),
    roadmapId: integer("roadmap_id")
      .notNull()
      .references(() => roadmapsTable.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    companyUrl: text("company_url").notNull(),
    webhookSent: boolean("webhook_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("lead_captures_roadmap_email_unique").on(table.roadmapId, table.email),
  ]
);

export const insertLeadCaptureSchema = createInsertSchema(leadCapturesTable).omit({
  id: true,
  webhookSent: true,
  createdAt: true,
});
export type InsertLeadCapture = z.infer<typeof insertLeadCaptureSchema>;
export type LeadCapture = typeof leadCapturesTable.$inferSelect;
