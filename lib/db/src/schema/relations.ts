import { relations } from "drizzle-orm";
import { usersTable } from "./users";
import { companiesTable } from "./companies";
import { organizationsTable } from "./organizations";
import { organizationMembersTable } from "./organization_members";
import { websiteProjectsTable } from "./website_projects";
import { brandProfilesTable } from "./brand_profiles";
import { goalsTable } from "./goals";
import { briefsTable } from "./briefs";
import { contentPiecesTable } from "./content_pieces";
import { trackedKeywordsTable } from "./tracked_keywords";
import { keywordRankSnapshotsTable } from "./keyword_rank_snapshots";
import { sessionsTable } from "./sessions";

export const usersRelations = relations(usersTable, ({ many }) => ({
  websiteProjects: many(websiteProjectsTable),
  companies: many(companiesTable),
  sessions: many(sessionsTable),
  organizationMemberships: many(organizationMembersTable),
  ownedOrganizations: many(organizationsTable),
}));

export const organizationsRelations = relations(organizationsTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [organizationsTable.ownerId],
    references: [usersTable.id],
  }),
  company: one(companiesTable, {
    fields: [organizationsTable.companyId],
    references: [companiesTable.id],
  }),
  members: many(organizationMembersTable),
  websiteProjects: many(websiteProjectsTable),
}));

export const organizationMembersRelations = relations(organizationMembersTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [organizationMembersTable.organizationId],
    references: [organizationsTable.id],
  }),
  user: one(usersTable, {
    fields: [organizationMembersTable.userId],
    references: [usersTable.id],
  }),
  assignedProject: one(websiteProjectsTable, {
    fields: [organizationMembersTable.assignedProjectId],
    references: [websiteProjectsTable.id],
  }),
}));

export const companiesRelations = relations(companiesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [companiesTable.userId],
    references: [usersTable.id],
  }),
  organizations: many(organizationsTable),
}));

export const websiteProjectsRelations = relations(websiteProjectsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [websiteProjectsTable.userId],
    references: [usersTable.id],
  }),
  organization: one(organizationsTable, {
    fields: [websiteProjectsTable.organizationId],
    references: [organizationsTable.id],
  }),
  brandProfile: one(brandProfilesTable, {
    fields: [websiteProjectsTable.id],
    references: [brandProfilesTable.websiteProjectId],
  }),
  goals: many(goalsTable),
  contentPieces: many(contentPiecesTable),
  trackedKeywords: many(trackedKeywordsTable),
}));

export const brandProfilesRelations = relations(brandProfilesTable, ({ one }) => ({
  websiteProject: one(websiteProjectsTable, {
    fields: [brandProfilesTable.websiteProjectId],
    references: [websiteProjectsTable.id],
  }),
}));

export const goalsRelations = relations(goalsTable, ({ one, many }) => ({
  project: one(websiteProjectsTable, {
    fields: [goalsTable.projectId],
    references: [websiteProjectsTable.id],
  }),
  briefs: many(briefsTable),
}));

export const briefsRelations = relations(briefsTable, ({ one, many }) => ({
  goal: one(goalsTable, {
    fields: [briefsTable.goalId],
    references: [goalsTable.id],
  }),
  contentPieces: many(contentPiecesTable),
}));

export const contentPiecesRelations = relations(contentPiecesTable, ({ one }) => ({
  websiteProject: one(websiteProjectsTable, {
    fields: [contentPiecesTable.websiteProjectId],
    references: [websiteProjectsTable.id],
  }),
  brief: one(briefsTable, {
    fields: [contentPiecesTable.briefId],
    references: [briefsTable.id],
  }),
}));

export const trackedKeywordsRelations = relations(trackedKeywordsTable, ({ one, many }) => ({
  websiteProject: one(websiteProjectsTable, {
    fields: [trackedKeywordsTable.websiteProjectId],
    references: [websiteProjectsTable.id],
  }),
  rankSnapshots: many(keywordRankSnapshotsTable),
}));

export const keywordRankSnapshotsRelations = relations(keywordRankSnapshotsTable, ({ one }) => ({
  trackedKeyword: one(trackedKeywordsTable, {
    fields: [keywordRankSnapshotsTable.trackedKeywordId],
    references: [trackedKeywordsTable.id],
  }),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));
