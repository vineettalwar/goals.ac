import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";
import { usageEventsTable } from "./usage_events";

// Append-only ledger — no updatedAt, rows are never mutated after insert.
export const creditLedgerTable = sqliteTable(
  "credit_ledger",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    // grant | topup | model_consumption | orchestration | reserve | release | expiry
    entryType: text("entry_type").notNull(),
    // Signed credits — debits are negative.
    amount: integer("amount").notNull(),
    usageEventId: integer("usage_event_id").references(() => usageEventsTable.id),
    jobId: text("job_id"),
    // Idempotent reservation key — unique among non-null values.
    runId: text("run_id"),
    meta: text("meta", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("credit_ledger_run_id_unique").on(t.runId).where(sql`${t.runId} is not null`)],
);

export const insertCreditLedgerSchema = createInsertSchema(creditLedgerTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCreditLedger = z.infer<typeof insertCreditLedgerSchema>;
export type CreditLedger = typeof creditLedgerTable.$inferSelect;
