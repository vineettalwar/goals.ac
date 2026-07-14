import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roadmapsTable } from "./roadmaps";

export const leadCapturesTable = sqliteTable(
  "lead_captures",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    roadmapId: integer("roadmap_id")
      .notNull()
      .references(() => roadmapsTable.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    companyUrl: text("company_url").notNull(),
    webhookSent: integer("webhook_sent", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
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
