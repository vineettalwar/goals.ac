/**
 * Dialect-aware table exports — use `import { usersTable } from "@workspace/db/active-schema"`
 * when building queries that must run on both Postgres and D1.
 *
 * Prefer resolving after `setD1Binding()` / `DB_DIALECT=d1` is set (Workers `fetch` wiring).
 * Module-load time uses `process.env.DB_DIALECT` when the binding is not yet set.
 */
import { isD1Dialect } from "./dialect";
import * as pgSchema from "./schema";
import * as sqliteSchema from "./schema-sqlite";

const active = isD1Dialect() ? sqliteSchema : pgSchema;

export const analyticsPropertyConnectionsTable = active.analyticsPropertyConnectionsTable;
export const apiKeysTable = active.apiKeysTable;
export const articleIdeaImportsTable = active.articleIdeaImportsTable;
export const articleIdeaSourcesTable = active.articleIdeaSourcesTable;
export const brandProfilesTable = active.brandProfilesTable;
export const brandVoiceChunksTable = active.brandVoiceChunksTable;
export const brandVoiceSourcesTable = active.brandVoiceSourcesTable;
export const briefsTable = active.briefsTable;
export const companiesTable = active.companiesTable;
export const competitorAnalysesTable = active.competitorAnalysesTable;
export const contactSubmissionsTable = active.contactSubmissionsTable;
export const contentItemsTable = active.contentItemsTable;
export const contentPiecesTable = active.contentPiecesTable;
export const contentStrategiesTable = active.contentStrategiesTable;
export const conversations = active.conversations;
export const creditLedgerTable = active.creditLedgerTable;
export const ga4PageMetricsTable = active.ga4PageMetricsTable;
export const geoAuditsTable = active.geoAuditsTable;
export const goalsTable = active.goalsTable;
export const gscSearchQueriesTable = active.gscSearchQueriesTable;
export const industriesTable = active.industriesTable;
export const integrationConnectionsTable = active.integrationConnectionsTable;
export const keywordAnalysesTable = active.keywordAnalysesTable;
export const keywordOpportunitiesTable = active.keywordOpportunitiesTable;
export const keywordRankAlertsTable = active.keywordRankAlertsTable;
export const keywordRankSnapshotsTable = active.keywordRankSnapshotsTable;
export const leadCapturesTable = active.leadCapturesTable;
export const llmVisibilityPromptsTable = active.llmVisibilityPromptsTable;
export const llmVisibilitySnapshotsTable = active.llmVisibilitySnapshotsTable;
export const locationsTable = active.locationsTable;
export const marketingPersonasTable = active.marketingPersonasTable;
export const messages = active.messages;
export const orgAuditLogTable = active.orgAuditLogTable;
export const orgInvitesTable = active.orgInvitesTable;
export const organizationMembersTable = active.organizationMembersTable;
export const organizationsTable = active.organizationsTable;
export const planQuotaConfigTable = active.planQuotaConfigTable;
export const platformSettingsTable = active.platformSettingsTable;
export const projectRoadmapsTable = active.projectRoadmapsTable;
export const publishRecordsTable = active.publishRecordsTable;
export const roadmapsTable = active.roadmapsTable;
export const scheduledArticlesTable = active.scheduledArticlesTable;
export const searchPropertyConnectionsTable = active.searchPropertyConnectionsTable;
export const seoArticlesTable = active.seoArticlesTable;
export const sessionsTable = active.sessionsTable;
export const socialPostMetricsTable = active.socialPostMetricsTable;
export const trackedKeywordsTable = active.trackedKeywordsTable;
export const usageEventsTable = active.usageEventsTable;
export const usersTable = active.usersTable;
export const waitlistSignupsTable = active.waitlistSignupsTable;
export const websiteProjectsTable = active.websiteProjectsTable;
export const wordpressConnectionsTable = active.wordpressConnectionsTable;
export const workspacesTable = active.workspacesTable;

// Types and non-table exports always come from the Postgres schema definitions.
export type * from "./schema";
