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
import { agentRunsTable } from "./agent_loop";

export type SeoChatRole = "user" | "assistant";

export const seoChatThreadsTable = pgTable(
  "seo_chat_threads",
  {
    id: serial("id").primaryKey(),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    title: text("title").notNull().default("New chat"),
    lastAgentRunId: integer("last_agent_run_id").references(() => agentRunsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("seo_chat_threads_project_idx").on(t.websiteProjectId),
    index("seo_chat_threads_user_idx").on(t.websiteProjectId, t.userId),
  ],
);

export const seoChatMessagesTable = pgTable(
  "seo_chat_messages",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id")
      .notNull()
      .references(() => seoChatThreadsTable.id, { onDelete: "cascade" }),
    role: text("role").$type<SeoChatRole>().notNull(),
    content: text("content").notNull(),
    agentRunId: integer("agent_run_id").references(() => agentRunsTable.id, { onDelete: "set null" }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("seo_chat_messages_thread_idx").on(t.threadId),
    index("seo_chat_messages_run_idx").on(t.agentRunId),
  ],
);

export const projectChatMemoryTable = pgTable(
  "project_chat_memory",
  {
    id: serial("id").primaryKey(),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    brandVoiceNotes: text("brand_voice_notes").notNull().default(""),
    bannedClaims: text("banned_claims").notNull().default(""),
    lastDecisions: jsonb("last_decisions").$type<Array<{ at: string; text: string }>>().notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("project_chat_memory_project_uidx").on(t.websiteProjectId)],
);

export type SeoChatThread = typeof seoChatThreadsTable.$inferSelect;
export type NewSeoChatThread = typeof seoChatThreadsTable.$inferInsert;
export type SeoChatMessage = typeof seoChatMessagesTable.$inferSelect;
export type NewSeoChatMessage = typeof seoChatMessagesTable.$inferInsert;
export type ProjectChatMemory = typeof projectChatMemoryTable.$inferSelect;
export type NewProjectChatMemory = typeof projectChatMemoryTable.$inferInsert;
