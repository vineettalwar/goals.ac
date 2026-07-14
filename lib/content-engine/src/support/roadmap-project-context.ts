import { db } from "@workspace/db";
import { goalsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { loadBrandVoiceGenerationContext } from "./brand-voice-generation";
import { loadBrandScanContext } from "./brand-scan-context";

function formatGoalsBlock(
  goals: { objective: string; targetMetric: string; baseline: string | null; icp: string | null }[],
): string {
  if (goals.length === 0) return "";
  const lines = goals.map((goal) => {
    const parts = [`- ${goal.objective}: ${goal.targetMetric}`];
    if (goal.baseline?.trim()) parts.push(`baseline ${goal.baseline.trim()}`);
    if (goal.icp?.trim()) parts.push(`ICP: ${goal.icp.trim()}`);
    return parts.join(", ");
  });
  return `Active goals:\n${lines.join("\n")}`;
}

function formatScanBlock(
  scan: Awaited<ReturnType<typeof loadBrandScanContext>>,
): string {
  if (!scan) return "";
  const lines: string[] = [];
  if (scan.pageCount > 0) {
    lines.push(`Site: ${scan.pageCount} pages indexed (${scan.websiteUrl})`);
  }
  const gscTopPages = scan.gscTopPages ?? [];
  if (gscTopPages.length > 0) {
    const pages = gscTopPages
      .slice(0, 5)
      .map((p) => `${p.url} (${p.impressions} impressions)`)
      .join("; ");
    lines.push(`Top GSC pages: ${pages}`);
  }
  const cmsTitles = (scan.cmsSiteGraph ?? [])
    .map((post) => post.title?.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (cmsTitles.length > 0) {
    lines.push(`Existing content themes: ${cmsTitles.join("; ")}`);
  }
  return lines.length > 0 ? lines.join("\n") : "";
}

export async function loadRoadmapProjectContext(
  projectId: number,
  userId?: number,
): Promise<string | null> {
  const query = "12-month B2B growth roadmap strategy acquisition channels SEO content";
  const [voiceCtx, scanCtx, activeGoals] = await Promise.all([
    loadBrandVoiceGenerationContext(projectId, query, userId),
    loadBrandScanContext(projectId),
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

  const sections: string[] = [];

  if (voiceCtx) {
    const { brand, promptContext } = voiceCtx;
    const header = [
      brand.companyName?.trim() && `Company: ${brand.companyName.trim()} (${brand.websiteUrl})`,
      brand.industry?.trim() && `Industry: ${brand.industry.trim()}`,
      brand.targetAudience?.trim() && `Target audience: ${brand.targetAudience.trim()}`,
      brand.primaryKeywords?.length
        ? `Primary keywords: ${brand.primaryKeywords.slice(0, 8).join(", ")}`
        : null,
      brand.brandMemory?.competitorPositioning?.trim() &&
        `Competitive positioning: ${brand.brandMemory.competitorPositioning.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (header) sections.push(header);
    if (promptContext?.trim()) sections.push(promptContext.trim());
  }

  const scanBlock = formatScanBlock(scanCtx);
  if (scanBlock) sections.push(scanBlock);

  const goalsBlock = formatGoalsBlock(activeGoals);
  if (goalsBlock) sections.push(goalsBlock);

  if (sections.length === 0) return null;

  return [
    "Company context (from project scan — tailor every recommendation to this business):",
    sections.join("\n\n"),
  ].join("\n");
}
