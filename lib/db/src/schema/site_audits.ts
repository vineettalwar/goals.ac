import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";

export type SiteAuditStatus = "pending" | "running" | "done" | "failed";

export type SiteAuditIssueRow = {
  issueType: string;
  pageUrl: string;
  severity: string;
  title: string;
  explanation: string;
  howToFix: string;
  details?: Record<string, unknown>;
};

export const siteAuditsTable = pgTable(
  "site_audits",
  {
    id: serial("id").primaryKey(),
    websiteProjectId: integer("website_project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    startUrl: text("start_url").notNull(),
    status: text("status").$type<SiteAuditStatus>().notNull().default("pending"),
    maxPages: integer("max_pages").notNull().default(50),
    pagesCrawled: integer("pages_crawled").notNull().default(0),
    crawlComplete: boolean("crawl_complete").notNull().default(false),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("site_audits_project_idx").on(t.websiteProjectId)],
);

export const siteAuditPagesTable = pgTable(
  "site_audit_pages",
  {
    id: serial("id").primaryKey(),
    siteAuditId: integer("site_audit_id")
      .notNull()
      .references(() => siteAuditsTable.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    statusCode: integer("status_code"),
    fetchClass: text("fetch_class").notNull().default("ok"),
    title: text("title"),
    metaDescription: text("meta_description"),
    wordCount: integer("word_count").notNull().default(0),
    crawlDepth: integer("crawl_depth"),
    fromSitemap: boolean("from_sitemap").notNull().default(false),
  },
  (t) => [index("site_audit_pages_audit_idx").on(t.siteAuditId)],
);

export const siteAuditIssuesTable = pgTable(
  "site_audit_issues",
  {
    id: serial("id").primaryKey(),
    siteAuditId: integer("site_audit_id")
      .notNull()
      .references(() => siteAuditsTable.id, { onDelete: "cascade" }),
    issueType: text("issue_type").notNull(),
    severity: text("severity").notNull(),
    pageUrl: text("page_url").notNull(),
    title: text("title").notNull(),
    explanation: text("explanation").notNull(),
    howToFix: text("how_to_fix").notNull(),
    details: jsonb("details").$type<Record<string, unknown> | null>(),
  },
  (t) => [
    index("site_audit_issues_audit_idx").on(t.siteAuditId),
    index("site_audit_issues_severity_idx").on(t.siteAuditId, t.severity),
  ],
);

export type SiteAudit = typeof siteAuditsTable.$inferSelect;
export type SiteAuditPage = typeof siteAuditPagesTable.$inferSelect;
export type SiteAuditIssue = typeof siteAuditIssuesTable.$inferSelect;
