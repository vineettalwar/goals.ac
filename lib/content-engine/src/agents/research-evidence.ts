/**
 * Grounded research for the Ferret stage.
 *
 * Facts marked verified must come from a connected source (GSC, keyword hub,
 * competitor analyses, or editor-supplied URLs). Prompt-only invention stays
 * unverified. When nothing is connected, the pipeline continues with an
 * explicit "no research data connected" note instead of fabricating evidence.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  competitorAnalysesTable,
  gscSearchQueriesTable,
  keywordOpportunitiesTable,
  searchPropertyConnectionsTable,
  trackedKeywordsTable,
} from "@workspace/db/schema";

export const NO_RESEARCH_DATA_NOTE = "no research data connected";

export type ResearchFact = {
  fact: string;
  source: string;
  url?: string;
  verified: boolean;
};

export type ResearchEvidenceSource = {
  id: "gsc" | "keywords" | "competitors" | "editor_urls";
  label: string;
};

export type ResearchEvidence = {
  connected: boolean;
  sources: ResearchEvidenceSource[];
  facts: ResearchFact[];
  note?: string;
};

export function emptyResearchEvidence(): ResearchEvidence {
  return {
    connected: false,
    sources: [],
    facts: [],
    note: NO_RESEARCH_DATA_NOTE,
  };
}

export function sourceUrlsFromAngleHint(angleHint?: string | null): string[] {
  if (!angleHint?.trim()) return [];
  const tagged = angleHint.match(/sources:\s*(.+)$/i);
  const blob = tagged?.[1] ?? angleHint;
  return [...blob.matchAll(/https?:\/\/[^\s|,]+/g)].map((m) => m[0].replace(/[)>.,;]+$/, ""));
}

export function researchFromSourceUrls(urls: string[]): ResearchEvidence {
  const unique = [...new Set(urls.map((u) => u.trim()).filter((u) => u.startsWith("http")))];
  if (unique.length === 0) return emptyResearchEvidence();
  return {
    connected: true,
    sources: [{ id: "editor_urls", label: "Editor source URLs" }],
    facts: unique.map((url) => ({
      fact: `Editor-supplied source ${url}`,
      source: url,
      url,
      verified: true,
    })),
  };
}

export function mergeResearchEvidence(...parts: ResearchEvidence[]): ResearchEvidence {
  const sources: ResearchEvidenceSource[] = [];
  const seenSource = new Set<string>();
  const facts: ResearchFact[] = [];
  const seenFact = new Set<string>();

  for (const part of parts) {
    for (const source of part.sources) {
      if (seenSource.has(source.id)) continue;
      seenSource.add(source.id);
      sources.push(source);
    }
    for (const fact of part.facts) {
      const key = `${fact.source}|${fact.fact}`;
      if (seenFact.has(key)) continue;
      seenFact.add(key);
      facts.push(fact);
    }
  }

  if (facts.length === 0 && sources.length === 0) return emptyResearchEvidence();
  return { connected: true, sources, facts };
}

function keywordHaystack(keyword: string): string {
  return keyword.trim().toLowerCase();
}

function mentionsKeyword(text: string, keyword: string): boolean {
  const needle = keywordHaystack(keyword);
  if (!needle) return true;
  return text.toLowerCase().includes(needle);
}

export function researchPromptBlock(evidence: ResearchEvidence): string {
  if (!evidence.connected) {
    return [
      "RESEARCH DATA: none connected.",
      `You must NOT set verified: true on any fact. Flag every claim unverified.`,
      `Include "note": "${NO_RESEARCH_DATA_NOTE}" on the JSON object.`,
    ].join("\n");
  }
  return [
    "GROUNDED RESEARCH EVIDENCE (only these may be marked verified: true):",
    JSON.stringify({ sources: evidence.sources, facts: evidence.facts }, null, 2),
    "Any additional facts you add must use verified: false.",
  ].join("\n");
}

function evidenceAllowsVerified(item: { source?: unknown; url?: unknown; fact?: unknown }, evidence: ResearchEvidence): boolean {
  if (!evidence.connected) return false;
  const source = typeof item.source === "string" ? item.source.trim().toLowerCase() : "";
  const url = typeof item.url === "string" ? item.url.trim().toLowerCase() : "";
  const fact = typeof item.fact === "string" ? item.fact.trim().toLowerCase() : "";
  return evidence.facts.some((allowed) => {
    const allowedSource = allowed.source.toLowerCase();
    const allowedUrl = (allowed.url ?? allowed.source).toLowerCase();
    const allowedFact = allowed.fact.toLowerCase();
    if (url && (url === allowedUrl || allowedUrl.includes(url) || url.includes(allowedUrl))) return true;
    if (source && (source === allowedSource || source === allowedUrl)) return true;
    if (fact && allowedFact && fact === allowedFact) return true;
    return false;
  });
}

function asFactList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
}

/**
 * Strip fabricated verified flags. Unconnected research always carries the
 * explicit no-data note.
 */
export function sanitizeFerretResearch(output: unknown, evidence: ResearchEvidence): Record<string, unknown> {
  const obj =
    output && typeof output === "object" ? { ...(output as Record<string, unknown>) } : {};

  const keyFacts = asFactList(obj.keyFacts).map((row) => ({
    ...row,
    verified: evidenceAllowsVerified(row, evidence),
  }));
  const statistics = asFactList(obj.statistics).map((row) => ({
    ...row,
    verified: evidenceAllowsVerified(
      { source: row.source, url: row.url, fact: typeof row.stat === "string" ? row.stat : row.fact },
      evidence,
    ),
  }));

  obj.keyFacts = keyFacts;
  obj.statistics = statistics;
  obj.researchConnected = evidence.connected;
  if (!evidence.connected) {
    obj.note = NO_RESEARCH_DATA_NOTE;
    obj.verified = false;
  } else {
    obj.groundedSources = evidence.sources.map((s) => s.id);
  }
  return obj;
}

export async function loadResearchEvidence(options: {
  projectId?: number | null;
  keyword: string;
  sourceUrls?: string[];
}): Promise<ResearchEvidence> {
  const urlEvidence = researchFromSourceUrls(options.sourceUrls ?? []);
  if (!options.projectId) return urlEvidence.connected ? urlEvidence : emptyResearchEvidence();

  try {
    const projectId = options.projectId;
    const keyword = options.keyword;

    const [gscConnection, gscRows, keywordRows, trackedRows, competitorRows] = await Promise.all([
      db
        .select({ id: searchPropertyConnectionsTable.id })
        .from(searchPropertyConnectionsTable)
        .where(eq(searchPropertyConnectionsTable.projectId, projectId))
        .limit(1),
      db
        .select({
          query: gscSearchQueriesTable.query,
          clicks: gscSearchQueriesTable.clicks,
          impressions: gscSearchQueriesTable.impressions,
          position: gscSearchQueriesTable.position,
          page: gscSearchQueriesTable.page,
        })
        .from(gscSearchQueriesTable)
        .where(eq(gscSearchQueriesTable.projectId, projectId))
        .orderBy(desc(gscSearchQueriesTable.clicks))
        .limit(50),
      db
        .select({
          keyword: keywordOpportunitiesTable.keyword,
          suggestedTitle: keywordOpportunitiesTable.suggestedTitle,
          suggestedAngle: keywordOpportunitiesTable.suggestedAngle,
          source: keywordOpportunitiesTable.source,
          opportunityScore: keywordOpportunitiesTable.opportunityScore,
        })
        .from(keywordOpportunitiesTable)
        .where(eq(keywordOpportunitiesTable.websiteProjectId, projectId))
        .orderBy(desc(keywordOpportunitiesTable.opportunityScore))
        .limit(40),
      db
        .select({
          keyword: trackedKeywordsTable.keyword,
          targetUrl: trackedKeywordsTable.targetUrl,
        })
        .from(trackedKeywordsTable)
        .where(eq(trackedKeywordsTable.websiteProjectId, projectId))
        .limit(40),
      db
        .select({
          competitorUrl: competitorAnalysesTable.competitorUrl,
          result: competitorAnalysesTable.result,
        })
        .from(competitorAnalysesTable)
        .where(eq(competitorAnalysesTable.websiteProjectId, projectId))
        .orderBy(desc(competitorAnalysesTable.createdAt))
        .limit(5),
    ]);

    const parts: ResearchEvidence[] = [];

    const matchingGsc = gscRows.filter((row) => mentionsKeyword(row.query, keyword)).slice(0, 8);
    if (gscConnection.length > 0 && matchingGsc.length > 0) {
      parts.push({
        connected: true,
        sources: [{ id: "gsc", label: "Google Search Console" }],
        facts: matchingGsc.map((row) => ({
          fact: `GSC query "${row.query}" — ${row.clicks} clicks, ${row.impressions} impressions, avg position ${row.position}`,
          source: "Google Search Console",
          url: row.page ?? undefined,
          verified: true,
        })),
      });
    } else if (gscConnection.length > 0 && gscRows.length > 0) {
      // Connected, but the target keyword is not in the recent query set — still a real source.
      const top = gscRows.slice(0, 3);
      parts.push({
        connected: true,
        sources: [{ id: "gsc", label: "Google Search Console" }],
        facts: top.map((row) => ({
          fact: `Related GSC query "${row.query}" — ${row.clicks} clicks, ${row.impressions} impressions`,
          source: "Google Search Console",
          url: row.page ?? undefined,
          verified: true,
        })),
      });
    }

    const matchingKw = keywordRows.filter((row) => mentionsKeyword(row.keyword, keyword)).slice(0, 6);
    const matchingTracked = trackedRows.filter((row) => mentionsKeyword(row.keyword, keyword)).slice(0, 6);
    if (matchingKw.length > 0 || matchingTracked.length > 0) {
      const facts: ResearchFact[] = [
        ...matchingKw.map((row) => ({
          fact: `Keyword hub: "${row.keyword}" (score ${row.opportunityScore}). ${row.suggestedAngle}`,
          source: `keyword hub (${row.source})`,
          verified: true as const,
        })),
        ...matchingTracked.map((row) => ({
          fact: `Tracked keyword "${row.keyword}"`,
          source: "keyword rank tracking",
          url: row.targetUrl ?? undefined,
          verified: true as const,
        })),
      ];
      parts.push({
        connected: true,
        sources: [{ id: "keywords", label: "Keyword hub" }],
        facts,
      });
    }

    if (competitorRows.length > 0) {
      const facts: ResearchFact[] = [];
      for (const row of competitorRows) {
        const result = row.result as {
          competitorName?: string;
          contentGaps?: string[];
          weaknesses?: string[];
        };
        const name = result.competitorName || row.competitorUrl;
        const gap = result.contentGaps?.[0];
        const weakness = result.weaknesses?.[0];
        if (gap) {
          facts.push({
            fact: `${name} content gap: ${gap}`,
            source: row.competitorUrl,
            url: row.competitorUrl,
            verified: true,
          });
        } else if (weakness) {
          facts.push({
            fact: `${name} weakness: ${weakness}`,
            source: row.competitorUrl,
            url: row.competitorUrl,
            verified: true,
          });
        } else {
          facts.push({
            fact: `Competitor analysis on file for ${name}`,
            source: row.competitorUrl,
            url: row.competitorUrl,
            verified: true,
          });
        }
      }
      parts.push({
        connected: true,
        sources: [{ id: "competitors", label: "Competitor analyses" }],
        facts,
      });
    }

    return mergeResearchEvidence(urlEvidence, ...parts);
  } catch {
    return urlEvidence.connected ? urlEvidence : emptyResearchEvidence();
  }
}
