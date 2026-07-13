import type { KeywordDifficulty } from "./keywordAnalyzer";
import type { DomainKeywordGap } from "@workspace/keyword-research-provider";
import { formatVolume } from "@workspace/keyword-research-provider";
import { computeOpportunityScore, type GapOpportunity } from "./keywordGapAnalyzer";

export function semrushIntentLabel(intents?: string[]): string | undefined {
  if (!intents?.length) return undefined;
  const first = intents[0]?.toLowerCase() ?? "";
  if (first.includes("transactional")) return "transactional";
  if (first.includes("commercial")) return "commercial";
  if (first.includes("informational")) return "informational";
  return first;
}

function defaultSemrushTitle(keyword: string, language?: string): string {
  if (language === "de") return `Leitfaden: ${keyword}`;
  return `Guide: ${keyword}`;
}

function defaultSemrushAngle(
  gap: DomainKeywordGap,
  language?: string,
): string {
  const volume = formatVolume(gap.searchVolume);
  if (language === "de") {
    return `Wettbewerber ranken für „${gap.keyword}" (${volume}, KD ${gap.keywordDifficulty}). Erstellen Sie gezielten Content, um die Lücke zu schließen.`;
  }
  return `Competitors rank for "${gap.keyword}" (${volume}, KD ${gap.keywordDifficulty}). Create targeted content to close the gap.`;
}

export function semrushGapToOpportunity(
  gap: DomainKeywordGap,
  enrichment?: {
    suggestedTitle?: string;
    suggestedAngle?: string;
    intent?: string;
    competitorUrl?: string;
  },
  language?: string,
): GapOpportunity {
  const intent = enrichment?.intent ?? "informational";
  const defaultTitle = enrichment?.suggestedTitle ?? defaultSemrushTitle(gap.keyword, language);
  const defaultAngle = enrichment?.suggestedAngle ?? defaultSemrushAngle(gap, language);

  return {
    keyword: gap.keyword,
    source: "semrush",
    competitorUrl: enrichment?.competitorUrl,
    estimatedVolume: formatVolume(gap.searchVolume),
    difficulty: gap.difficulty as KeywordDifficulty,
    opportunityScore: computeOpportunityScore({
      estimatedVolume: gap.searchVolume,
      difficulty: gap.difficulty as KeywordDifficulty,
      intent,
    }),
    intent,
    suggestedTitle: defaultTitle,
    suggestedAngle: defaultAngle,
  };
}

export function semrushGapsToOpportunities(
  gaps: DomainKeywordGap[],
  enrichmentByKeyword?: Map<string, { suggestedTitle: string; suggestedAngle: string; intent?: string }>,
  competitorUrl?: string,
  language?: string,
): GapOpportunity[] {
  return gaps.map((gap) => {
    const enrichment = enrichmentByKeyword?.get(gap.keyword.toLowerCase());
    return semrushGapToOpportunity(
      gap,
      {
        suggestedTitle: enrichment?.suggestedTitle,
        suggestedAngle: enrichment?.suggestedAngle,
        intent: enrichment?.intent,
        competitorUrl,
      },
      language,
    );
  });
}
