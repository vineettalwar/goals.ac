export {
  AUDIT_ISSUE_TYPES,
  AUDIT_USER_AGENT,
  ISSUE_SEVERITY_ORDER,
  getIssueDescriptor,
  type AuditIssueDescriptor,
  type AuditIssueType,
  type IssueSeverity,
} from "./issue-types";
export { analyzeHtml, emptyPage } from "./page-analyzer";
export { runPageReporters } from "./page-reporters";
export {
  findBrokenInternalLinks,
  findDuplicates,
  findOrphans,
  findRedirectChainsAndLoops,
} from "./multipage-checks";
export { runSiteAuditCrawl, type SiteAuditCrawlOptions } from "./crawl";
export type {
  CrawledPage,
  DetectedIssue,
  FetchClass,
  PageLink,
  SiteAuditResult,
} from "./types";
