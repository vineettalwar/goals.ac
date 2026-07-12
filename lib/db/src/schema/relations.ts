import { relations } from "drizzle-orm";
import { usersTable } from "./users";
import { companiesTable } from "./companies";
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
}));

export const companiesRelations = relations(companiesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [companiesTable.userId],
    references: [usersTable.id],
  }),
}));

export const websiteProjectsRelations = relations(websiteProjectsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [websiteProjectsTable.userId],
    references: [usersTable.id],
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
