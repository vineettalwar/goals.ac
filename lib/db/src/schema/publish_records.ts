import { pgTable, serial, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contentPiecesTable } from "./content_pieces";
import { websiteProjectsTable } from "./website_projects";

export const publishRecordsTable = pgTable(
  "publish_records",
  {
    id: serial("id").primaryKey(),
    contentPieceId: integer("content_piece_id")
      .notNull()
      .references(() => contentPiecesTable.id, { onDelete: "cascade" }),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    /** wordpress | typo3 | drupal | joomla | notion | webflow | ghost | webhook | shopify */
    provider: text("provider").notNull(),
    connectionId: integer("connection_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    remoteId: text("remote_id"),
    remoteUrl: text("remote_url"),
    status: text("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("publish_records_idempotency_uidx").on(table.idempotencyKey),
    index("publish_records_piece_id_idx").on(table.contentPieceId),
    index("publish_records_project_id_idx").on(table.websiteProjectId),
    index("publish_records_provider_idx").on(table.provider),
  ],
);

export const insertPublishRecordSchema = createInsertSchema(publishRecordsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPublishRecord = z.infer<typeof insertPublishRecordSchema>;
export type PublishRecord = typeof publishRecordsTable.$inferSelect;
