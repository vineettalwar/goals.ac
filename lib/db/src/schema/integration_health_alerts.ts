import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";
import { organizationsTable } from "./organizations";

export type IntegrationHealthAlertType = "reauth_required" | "connection_failing";
export type IntegrationHealthAlertStatus = "open" | "dismissed" | "resolved";

/**
 * Durable alert raised when a CMS/social/ESP connection's scheduled health
 * check flips from healthy (or unknown) to failing — see
 * `runProjectIntegrationHealth` in
 * `@workspace/content-engine/support/publishing/integration-health-service`.
 *
 * Connections live as entries in `website_projects.cms_integrations` (a JSON
 * blob keyed by platform), not as their own rows, so there is no per-connection
 * id to reference here — the (websiteProjectId, platform) pair identifies the
 * connection instead. `organizationId` is denormalized from the owning
 * project at write time so alerts can be listed by org without a join.
 */
export const integrationHealthAlertsTable = pgTable(
  "integration_health_alerts",
  {
    id: serial("id").primaryKey(),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    organizationId: integer("organization_id").references(() => organizationsTable.id, {
      onDelete: "cascade",
    }),
    platform: text("platform").notNull(),
    alertType: text("alert_type").notNull().$type<IntegrationHealthAlertType>(),
    message: text("message").notNull(),
    status: text("status").notNull().default("open").$type<IntegrationHealthAlertStatus>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("integration_health_alerts_project_status_idx").on(table.websiteProjectId, table.status),
    index("integration_health_alerts_org_status_idx").on(table.organizationId, table.status),
  ],
);

export type IntegrationHealthAlert = typeof integrationHealthAlertsTable.$inferSelect;
export type NewIntegrationHealthAlert = typeof integrationHealthAlertsTable.$inferInsert;
