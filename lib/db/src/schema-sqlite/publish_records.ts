import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contentPiecesTable } from "./content_pieces";
import { websiteProjectsTable } from "./website_projects";

export const publishRecordsTable = sqliteTable(
  "publish_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
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
