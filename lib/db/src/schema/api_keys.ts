import { pgTable, serial, text, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export type ApiKeyScope = "publish:write" | "content:read" | "render:preview";

export const apiKeysTable = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** SHA-256 hash of the raw API key */
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    scopes: jsonb("scopes").$type<ApiKeyScope[]>().notNull().default(["render:preview"]),
    rateLimitPerHour: integer("rate_limit_per_hour").notNull().default(60),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("api_keys_org_id_idx").on(table.organizationId),
    index("api_keys_key_hash_idx").on(table.keyHash),
  ],
);

export const insertApiKeySchema = createInsertSchema(apiKeysTable).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
});

export type ApiKey = typeof apiKeysTable.$inferSelect;
export type InsertApiKey = typeof apiKeysTable.$inferInsert;
