import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const workspacesTable = pgTable(
  "workspaces",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** 1:1 with organizations — credit ledger is keyed by workspace. */
    organizationId: integer("organization_id").references(() => organizationsTable.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("workspaces_organization_id_unique").on(t.organizationId)],
);

export const insertWorkspaceSchema = createInsertSchema(workspacesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspacesTable.$inferSelect;
