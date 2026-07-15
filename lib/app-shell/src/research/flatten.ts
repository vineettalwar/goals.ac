import type { CompetitorAnalysisResult, CompetitorAnalysisRow, ThreatLevel } from "./types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asThreat(value: unknown): ThreatLevel {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

/** Unwrap nested `result` (DB row) or accept already-flat analysis payloads. */
export function flattenCompetitorAnalysis(data: unknown): (CompetitorAnalysisResult & {
  id?: number;
  competitorUrl?: string;
  industry?: string;
  location?: string;
  stage?: string;
  createdAt?: string | null;
}) | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const nested =
    row.result && typeof row.result === "object" ? (row.result as Record<string, unknown>) : null;
  const source = nested ?? row;

  const competitorName =
    typeof source.competitorName === "string" ? source.competitorName : null;
  if (!competitorName) return null;

  return {
    id: typeof row.id === "number" ? row.id : undefined,
    competitorUrl: typeof row.competitorUrl === "string" ? row.competitorUrl : undefined,
    industry: typeof row.industry === "string" ? row.industry : undefined,
    location: typeof row.location === "string" ? row.location : undefined,
    stage: typeof row.stage === "string" ? row.stage : undefined,
    createdAt:
      typeof row.createdAt === "string" || row.createdAt === null
        ? (row.createdAt as string | null)
        : undefined,
    competitorName,
    summary: typeof source.summary === "string" ? source.summary : "",
    strengths: asStringArray(source.strengths),
    weaknesses: asStringArray(source.weaknesses),
    contentGaps: asStringArray(source.contentGaps),
    geoGaps: asStringArray(source.geoGaps),
    quickWins: asStringArray(source.quickWins),
    threatLevel: asThreat(source.threatLevel),
  };
}

export function flattenCompetitorAnalysisRow(data: unknown): CompetitorAnalysisRow | null {
  const flat = flattenCompetitorAnalysis(data);
  if (!flat || typeof (data as { id?: unknown })?.id !== "number") {
    if (!data || typeof data !== "object") return null;
    const row = data as Record<string, unknown>;
    if (typeof row.id !== "number" || typeof row.competitorUrl !== "string") return null;
    const nested = flattenCompetitorAnalysis(row);
    return {
      id: row.id,
      competitorUrl: row.competitorUrl,
      industry: typeof row.industry === "string" ? row.industry : "",
      location: typeof row.location === "string" ? row.location : undefined,
      stage: typeof row.stage === "string" ? row.stage : undefined,
      createdAt:
        typeof row.createdAt === "string" || row.createdAt === null
          ? (row.createdAt as string | null)
          : undefined,
      competitorName: nested?.competitorName,
      summary: nested?.summary,
      threatLevel: nested?.threatLevel,
      strengths: nested?.strengths,
      weaknesses: nested?.weaknesses,
      contentGaps: nested?.contentGaps,
      geoGaps: nested?.geoGaps,
      quickWins: nested?.quickWins,
    };
  }

  return {
    id: flat.id!,
    competitorUrl: flat.competitorUrl ?? "",
    industry: flat.industry ?? "",
    location: flat.location,
    stage: flat.stage,
    createdAt: flat.createdAt,
    competitorName: flat.competitorName,
    summary: flat.summary,
    threatLevel: flat.threatLevel,
    strengths: flat.strengths,
    weaknesses: flat.weaknesses,
    contentGaps: flat.contentGaps,
    geoGaps: flat.geoGaps,
    quickWins: flat.quickWins,
  };
}

export function flattenCompetitorAnalysisList(payload: unknown): CompetitorAnalysisRow[] {
  const rows =
    payload && typeof payload === "object" && Array.isArray((payload as { analyses?: unknown }).analyses)
      ? (payload as { analyses: unknown[] }).analyses
      : Array.isArray(payload)
        ? payload
        : [];
  return rows
    .map((row) => flattenCompetitorAnalysisRow(row))
    .filter((row): row is CompetitorAnalysisRow => row != null);
}
