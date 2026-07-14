import { hostFromUrl } from "./competitor-url";
import type { CompetitorAnalysisPayload } from "@workspace/db/schema";

export type CompetitorAnalysisSnapshot = {
  competitorUrl: string;
  competitorName: string;
  contentGaps: string[];
  quickWins: string[];
  weaknesses: string[];
  threatLevel: CompetitorAnalysisPayload["threatLevel"];
};

export function buildCompetitorPromptBlock(params: {
  competitorUrls: string[];
  analyses: CompetitorAnalysisSnapshot[];
  competitorPositioning?: string;
  focusUrl?: string;
}): string {
  const { competitorUrls, analyses, competitorPositioning, focusUrl } = params;
  if (competitorUrls.length === 0 && analyses.length === 0 && !competitorPositioning?.trim()) {
    return "";
  }

  const lines: string[] = ["\nCOMPETITIVE LANDSCAPE:"];

  if (competitorPositioning?.trim()) {
    lines.push(`- Brand positioning vs competitors: ${competitorPositioning.trim()}`);
  }

  if (competitorUrls.length > 0) {
    lines.push(`- Known competitors: ${competitorUrls.map(hostFromUrl).join(", ")}`);
  }

  const focusHost = focusUrl ? hostFromUrl(focusUrl) : null;
  if (focusHost) {
    lines.push(`- Primary competitor to differentiate against for this piece: ${focusHost}`);
  }

  for (const analysis of analyses) {
    const host = hostFromUrl(analysis.competitorUrl);
    const isFocus = focusHost && host === focusHost;
    lines.push(`\n${isFocus ? ">> " : ""}${analysis.competitorName} (${host}) — threat: ${analysis.threatLevel}`);
    if (analysis.weaknesses.length > 0) {
      lines.push(`  Weaknesses: ${analysis.weaknesses.slice(0, 4).join("; ")}`);
    }
    if (analysis.contentGaps.length > 0) {
      lines.push(`  Content gaps to exploit: ${analysis.contentGaps.slice(0, 5).join("; ")}`);
    }
    if (analysis.quickWins.length > 0) {
      lines.push(`  Quick wins: ${analysis.quickWins.slice(0, 3).join("; ")}`);
    }
  }

  lines.push(
    "\nDifferentiation requirements:",
    "- Cover angles competitors miss or under-serve — do not produce generic commodity content",
    "- Where relevant, contrast common competitor approaches without naming them excessively",
    "- Prioritize unique insights, proprietary frameworks, or concrete examples over recycled advice",
  );

  return lines.join("\n");
}
