import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";
import { companiesTable } from "./companies";
import { websiteProjectsTable } from "./website_projects";
import { orgInvitesTable, type OrgVertical } from "./org_invites";

/** Ordered ids of the one-question-per-screen onboarding flow. */
export const ONBOARDING_STEP_IDS = [
  "firm_name",
  "vertical",
  "website",
  "goal",
  "audience",
  "competitors",
  "linkedin",
  "search_console",
  "wordpress",
  "voice_review",
  "topics",
  "done",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type OnboardingStepState = "pending" | "skipped" | "done" | "failed";

export type OnboardingGoal = "leads" | "traffic" | "authority";

/**
 * Accumulated answers. Every field is optional: a step satisfied by invite prefill,
 * or explicitly skipped, simply never writes its key.
 */
export type OnboardingAnswers = {
  orgName?: string;
  vertical?: OrgVertical;
  websiteUrl?: string;
  goal?: OnboardingGoal;
  audience?: string;
  competitors?: string[];
  linkedin?: { mode: "oauth" | "paste" | "skipped"; postCount?: number };
  searchConsole?: { mode: "connected" | "skipped"; propertyUrl?: string };
  wordpress?: { mode: "plugin" | "app_password" | "skipped"; siteUrl?: string };
  topicIds?: number[];
};

export type OnboardingStepStatus = Partial<Record<OnboardingStepId, OnboardingStepState>>;

export const onboardingSessionsTable = sqliteTable("onboarding_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").references(() => organizationsTable.id, {
    onDelete: "cascade",
  }),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  websiteProjectId: integer("website_project_id").references(() => websiteProjectsTable.id, {
    onDelete: "set null",
  }),
  inviteId: integer("invite_id").references(() => orgInvitesTable.id, { onDelete: "set null" }),
  vertical: text("vertical").$type<OrgVertical>(),
  currentStep: text("current_step").notNull().default("firm_name").$type<OnboardingStepId>(),
  answers: text("answers", { mode: "json" }).$type<OnboardingAnswers>().notNull().default({} as Record<string, unknown>),
  stepStatus: text("step_status", { mode: "json" }).$type<OnboardingStepStatus>().notNull().default({} as Record<string, unknown>),
  /** Set when the flow finishes; a user may only have one unfinished session at a time. */
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
}, (table) => [
  index("onboarding_sessions_user_id_idx").on(table.userId),
  index("onboarding_sessions_org_id_idx").on(table.organizationId),
  uniqueIndex("onboarding_sessions_active_user_uidx")
    .on(table.userId)
    .where(sql`${table.completedAt} is null`),
]);

export const insertOnboardingSessionSchema = createInsertSchema(onboardingSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOnboardingSession = z.infer<typeof insertOnboardingSessionSchema>;
export type OnboardingSession = typeof onboardingSessionsTable.$inferSelect;
