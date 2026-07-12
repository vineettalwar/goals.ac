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
  roadmapsCatalog: ["roadmaps-catalog"] as const,
  websiteProject: (projectId: string | number) => ["website-project", String(projectId)] as const,
};
