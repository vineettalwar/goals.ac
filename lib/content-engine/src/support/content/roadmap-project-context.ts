import { db } from "@workspace/db";
import { goalsTable, websiteProjectsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { loadBrandContextForProject } from "../brand/brand-context-loader";
import { loadGscTopPages } from "../brand/brand-scan-context";

type GoalRow = {
  objective: string;
  targetMetric: string;
  baseline: string | null;
  icp: string | null;
};

export function assembleRoadmapProjectContext(parts: {
  companyName?: string | null;
  websiteUrl?: string | null;
  industry?: string | null;
  targetAudience?: string | null;
  primaryKeywords?: string[];
  competitorPositioning?: string | null;
  brandSummary?: string | null;
  pageCount?: number;
  gscTopPages?: { url: string; impressions: number }[];
  goals?: GoalRow[];
}): string | null {
  const sections: string[] = [];
  const header = [
    parts.companyName?.trim() &&
      `Company: ${parts.companyName.trim()}${parts.websiteUrl ? ` (${parts.websiteUrl})` : ""}`,
    parts.industry?.trim() && `Industry: ${parts.industry.trim()}`,
    parts.targetAudience?.trim() && `Target audience: ${parts.targetAudience.trim()}`,
    parts.primaryKeywords?.length
      ? `Primary keywords: ${parts.primaryKeywords.slice(0, 8).join(", ")}`
      : null,
    parts.competitorPositioning?.trim() &&
      `Competitive positioning: ${parts.competitorPositioning.trim()}`,
    parts.brandSummary?.trim() && `Brand summary: ${parts.brandSummary.trim().slice(0, 600)}`,
  ]
    .filter(Boolean)
    .join("\n");
  if (header) sections.push(header);

  const scanLines: string[] = [];
  if ((parts.pageCount ?? 0) > 0 && parts.websiteUrl) {
    scanLines.push(`Site: ${parts.pageCount} pages indexed (${parts.websiteUrl})`);
  }
  const gscTopPages = parts.gscTopPages ?? [];
  if (gscTopPages.length > 0) {
    const pages = gscTopPages
      .slice(0, 5)
      .map((p) => `${p.url} (${p.impressions} impressions)`)
      .join("; ");
    scanLines.push(`Top GSC pages: ${pages}`);
  }
  if (scanLines.length > 0) sections.push(scanLines.join("\n"));

  const goals = parts.goals ?? [];
  if (goals.length > 0) {
    const lines = goals.map((goal) => {
      const bits = [`- ${goal.objective}: ${goal.targetMetric}`];
      if (goal.baseline?.trim()) bits.push(`baseline ${goal.baseline.trim()}`);
      if (goal.icp?.trim()) bits.push(`ICP: ${goal.icp.trim()}`);
      return bits.join(", ");
    });
    sections.push(`Active goals:\n${lines.join("\n")}`);
  }

  if (sections.length === 0) return null;
  return [
    "Company context (from this project — one 12-month plan for this business, not a generic startup template):",
    sections.join("\n\n"),
  ].join("\n");
}

export async function loadRoadmapProjectContext(
  projectId: number,
  userId?: number,
): Promise<string | null> {
  const [brand, projectRow, gscTopPages, activeGoals] = await Promise.all([
    loadBrandContextForProject(projectId, userId),
    db
      .select({
        url: websiteProjectsTable.url,
        pageCount: websiteProjectsTable.pageCount,
      })
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, projectId))
      .limit(1),
    loadGscTopPages(projectId, 5),
    db
      .select({
        objective: goalsTable.objective,
        targetMetric: goalsTable.targetMetric,
        baseline: goalsTable.baseline,
        icp: goalsTable.icp,
      })
      .from(goalsTable)
      .where(and(eq(goalsTable.projectId, projectId), eq(goalsTable.status, "active")))
      .limit(3),
  ]);

  const project = projectRow[0];
  return assembleRoadmapProjectContext({
    companyName: brand?.companyName,
    websiteUrl: brand?.websiteUrl ?? project?.url,
    industry: brand?.industry,
    targetAudience: brand?.targetAudience,
    primaryKeywords: brand?.primaryKeywords,
    competitorPositioning: brand?.brandMemory?.competitorPositioning,
    brandSummary: brand?.brandMemory?.summary,
    pageCount: project?.pageCount ?? 0,
    gscTopPages,
    goals: activeGoals,
  });
}
