import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contentPiecesTable, type ContentPieceMetadata } from "./content_pieces";
import { usersTable } from "./users";

/**
 * The reason a version snapshot was captured. Recorded on the row so a
 * reviewer can tell "the AI rewrote this" apart from "a human edited it"
 * without diffing bodies.
 */
export const CONTENT_PIECE_VERSION_CHANGE_TYPES = [
  "generate",
  "humanize",
  "regenerate",
  "edit",
  "publish",
] as const;

export type ContentPieceVersionChangeType = (typeof CONTENT_PIECE_VERSION_CHANGE_TYPES)[number];

export const contentPieceVersionsTable = sqliteTable(
  "content_piece_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contentPieceId: integer("content_piece_id")
      .notNull()
      .references(() => contentPiecesTable.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    bodyMarkdown: text("body_markdown").notNull().default(""),
    pieceMetadata: text("piece_metadata", { mode: "json" }).$type<ContentPieceMetadata | null>(),
    changeType: text("change_type").notNull().$type<ContentPieceVersionChangeType>(),
    createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("content_piece_versions_content_piece_id_idx").on(table.contentPieceId),
    uniqueIndex("content_piece_versions_piece_version_idx").on(table.contentPieceId, table.versionNumber),
  ],
);

export const insertContentPieceVersionSchema = createInsertSchema(contentPieceVersionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertContentPieceVersion = z.infer<typeof insertContentPieceVersionSchema>;
export type ContentPieceVersion = typeof contentPieceVersionsTable.$inferSelect;
