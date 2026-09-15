import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";
import { usersTable } from "./users";
import { contentPiecesTable } from "./content_pieces";

export type AgentRunStatus =
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "budget_exhausted"
  | "no_evidence";

export type AgentActionType =
  | "refresh"
  | "new_content"
  | "ctr_title"
  | "internal_link"
  | "inspect_url";

export type AgentActionStatus = "open" | "approved" | "running" | "done" | "dismissed" | "blocked";

export type AgentActionEffort = "low" | "medium" | "high";

export const agentRunsTable = pgTable(
  "agent_runs",
  {
    id: serial("id").primaryKey(),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    goalKind: text("goal_kind").notNull(),
    goal: jsonb("goal").$type<Record<string, unknown>>().notNull(),
    status: text("status").$type<AgentRunStatus>().notNull().default("running"),
    stopReason: text("stop_reason"),
    policy: jsonb("policy").$type<Record<string, unknown>>().notNull().default({}),
    trajectory: jsonb("trajectory").$type<unknown[]>().notNull().default([]),
    creditsSpent: integer("credits_spent").notNull().default(0),
    contentPieceId: integer("content_piece_id").references(() => contentPiecesTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agent_runs_project_idx").on(t.websiteProjectId),
    index("agent_runs_status_idx").on(t.websiteProjectId, t.status),
  ],
);

export const agentActionItemsTable = pgTable(
  "agent_action_items",
  {
    id: serial("id").primaryKey(),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    actionType: text("action_type").$type<AgentActionType>().notNull(),
    title: text("title").notNull(),
    keyword: text("keyword").notNull(),
    url: text("url"),
    evidence: jsonb("evidence").$type<unknown[]>().notNull().default([]),
    estimatedImpact: integer("estimated_impact").notNull().default(0),
    confidence: integer("confidence").notNull().default(0),
    effort: text("effort").$type<AgentActionEffort>().notNull().default("medium"),
    status: text("status").$type<AgentActionStatus>().notNull().default("open"),
    opportunityScore: integer("opportunity_score").notNull().default(0),
    lastRunId: integer("last_run_id").references(() => agentRunsTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agent_action_items_project_idx").on(t.websiteProjectId),
    index("agent_action_items_status_idx").on(t.websiteProjectId, t.status),
    uniqueIndex("agent_action_items_fingerprint_uidx").on(t.websiteProjectId, t.fingerprint),
  ],
);

export type AgentRun = typeof agentRunsTable.$inferSelect;
export type NewAgentRun = typeof agentRunsTable.$inferInsert;
export type AgentActionItem = typeof agentActionItemsTable.$inferSelect;
export type NewAgentActionItem = typeof agentActionItemsTable.$inferInsert;
