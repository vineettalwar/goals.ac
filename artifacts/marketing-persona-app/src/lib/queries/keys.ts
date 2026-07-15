export const queryKeys = {
  websiteProjects: ["website-projects"] as const,
  company: ["company"] as const,
  goals: (projectId: string | number) => ["goals", String(projectId)] as const,
  briefs: (projectId: string | number) => ["briefs", String(projectId)] as const,
  trackedKeywords: (projectId: string | number) => ["tracked-keywords", String(projectId)] as const,
  keywordOpportunities: (projectId: string | number) =>
    ["keyword-opportunities", String(projectId)] as const,
  keywordAlerts: (projectId: string | number) => ["keyword-alerts", String(projectId)] as const,
  keywordSnapshots: (trackedId: number) => ["keyword-snapshots", trackedId] as const,
  projectContent: (projectId: string | number) => ["project-content", String(projectId)] as const,
  visibilitySettings: (projectId: string | number) =>
    ["visibility-settings", String(projectId)] as const,
  visibilitySummary: (projectId: string | number) => ["visibility-summary", String(projectId)] as const,
  searchProperties: (projectId: string | number) => ["search-properties", String(projectId)] as const,
  roadmapsCatalog: ["roadmaps-catalog"] as const,
  websiteProject: (projectId: string | number) => ["website-project", String(projectId)] as const,
  internalLinks: (projectId: string | number) => ["internal-links", String(projectId)] as const,
  orgSecurity: ["org-security"] as const,
  adminOrganizations: ["admin-organizations"] as const,
  platformSettings: ["platform-settings"] as const,
  brandProfile: (projectId: string | number) => ["brand-profile", String(projectId)] as const,
  articlePerformance: (projectId: string | number, startDate: string, endDate: string) =>
    ["article-performance", String(projectId), startDate, endDate] as const,
  gscSyncStatus: (projectId: string | number) => ["gsc-sync-status", String(projectId)] as const,
  semrushStatus: (projectId: string | number) => ["semrush-status", String(projectId)] as const,
  gscQueries: (
    projectId: string | number,
    range?: { startDate: string; endDate: string },
  ) =>
    range
      ? (["gsc-queries", String(projectId), range.startDate, range.endDate] as const)
      : (["gsc-queries", String(projectId)] as const),
  cmsIntegrations: (projectId: string | number) => ["cms-integrations", String(projectId)] as const,
  competitorContext: (projectId: string | number) => ["competitor-context", String(projectId)] as const,
  roadmapFormOptions: ["roadmap-form-options"] as const,
  stockImageStatus: ["stock-image-status"] as const,
  metaPages: (token: string) => ["meta-pages", token] as const,
  onboardingPersonas: (companyId: string) => ["onboarding-personas", companyId] as const,
};
