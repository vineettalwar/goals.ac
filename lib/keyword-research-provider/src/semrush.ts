import {
  databaseToCountryCode,
  extractDomain,
  kdToDifficulty,
  parseNumber,
  parseSemrushCsv,
} from "./helpers";
import { fetchWithTimeout, sanitizeSemrushErrorMessage, SemrushApiError } from "./http";
import type {
  DomainKeywordGap,
  KeywordMetrics,
  KeywordResearchProvider,
} from "./types";

const LEGACY_API_BASE = "https://api.semrush.com/";
const V4_API_BASE = "https://api.semrush.com/apis/v4/keywords/v1/metrics";

function buildGapDomainsParam(domain: string, competitors: string[]): string {
  const own = extractDomain(domain);
  const comps = competitors.map(extractDomain).filter(Boolean).slice(0, 3);
  if (comps.length === 0) {
    throw new Error("At least one competitor domain is required for Semrush gap analysis");
  }

  let expr = "*";
  for (const comp of comps) {
    expr += `|or|${comp}`;
  }
  if (own) {
    expr += `|-|or|${own}`;
  }
  return expr;
}

async function fetchLegacyReport(params: Record<string, string>): Promise<string> {
  const url = new URL(LEGACY_API_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetchWithTimeout(url.toString(), { method: "GET" });
  const text = await res.text();

  if (!res.ok) {
    throw new SemrushApiError(sanitizeSemrushErrorMessage(text || `Semrush API error (${res.status})`));
  }

  if (text.toUpperCase().startsWith("ERROR")) {
    throw new SemrushApiError(sanitizeSemrushErrorMessage(text));
  }

  return text;
}

export class SemrushProvider implements KeywordResearchProvider {
  readonly id = "semrush";

  async testConnection(params: { apiKey: string; database: string }): Promise<void> {
    await fetchLegacyReport({
      type: "domain_rank",
      key: params.apiKey,
      database: params.database,
      domain: "example.com",
      export_columns: "Dn,Rk",
      display_limit: "1",
    });
  }

  async getKeywordMetrics(params: {
    keywords: string[];
    database: string;
    apiKey: string;
  }): Promise<KeywordMetrics[]> {
    const country = databaseToCountryCode(params.database);
    const results: KeywordMetrics[] = [];

    for (const keyword of params.keywords.slice(0, 10)) {
      const trimmed = keyword.trim();
      if (!trimmed) continue;

      const url = new URL(V4_API_BASE);
      url.searchParams.set("keyword", trimmed);
      url.searchParams.set("country", country);

      try {
        const res = await fetchWithTimeout(url.toString(), {
          headers: { Authorization: `Apikey ${params.apiKey}` },
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new SemrushApiError(
            sanitizeSemrushErrorMessage(errText || `Semrush metrics API error (${res.status})`),
          );
        }

        const json = (await res.json()) as {
          meta?: { success?: boolean };
          data?: {
            search_volume?: string | number;
            keyword_difficulty?: number;
            cpc?: string | number;
            intents?: string[];
            serp_features?: string[];
          };
        };

        if (json.meta?.success === false) {
          continue;
        }

        const kd = json.data?.keyword_difficulty ?? 0;
        const volume = parseNumber(String(json.data?.search_volume ?? "0"));
        const cpcRaw = json.data?.cpc;
        const cpc =
          typeof cpcRaw === "number"
            ? cpcRaw
            : parseNumber(String(cpcRaw ?? "0")) / 100;

        results.push({
          keyword: trimmed,
          searchVolume: volume,
          keywordDifficulty: kd,
          difficulty: kdToDifficulty(kd),
          cpc: cpc > 0 ? cpc : undefined,
          intents: json.data?.intents,
          serpFeatures: json.data?.serp_features,
        });
      } catch (err) {
        if (err instanceof SemrushApiError) throw err;
        // Skip individual keyword failures; continue with the rest.
      }
    }

    return results;
  }

  async getDomainKeywordGaps(params: {
    domain: string;
    competitors: string[];
    database: string;
    apiKey: string;
    limit?: number;
  }): Promise<DomainKeywordGap[]> {
    const limit = params.limit ?? 25;
    const domainsExpr = buildGapDomainsParam(params.domain, params.competitors);

    const csv = await fetchLegacyReport({
      type: "domain_domains",
      key: params.apiKey,
      database: params.database,
      domains: domainsExpr,
      export_columns: "Ph,P0,P1,P2,Nq,Kd,Co,Cp",
      display_sort: "nq_desc",
      display_limit: String(limit),
      display_filter: "+|Nq|Gt|100",
    });

    const rows = parseSemrushCsv(csv);
    const gaps: DomainKeywordGap[] = [];

    for (const row of rows) {
      const keyword = row.Ph?.trim();
      if (!keyword) continue;

      const kd = parseNumber(row.Kd);
      const positions = [row.P0, row.P1, row.P2]
        .map((p) => parseNumber(p))
        .filter((p) => p > 0);

      const competition = parseNumber(row.Co);
      const cpc = parseNumber(row.Cp);

      gaps.push({
        keyword,
        searchVolume: parseNumber(row.Nq),
        keywordDifficulty: kd,
        difficulty: kdToDifficulty(kd),
        competitorPositions: positions,
        ...(competition > 0 ? { competition } : {}),
        ...(cpc > 0 ? { cpc } : {}),
      });
    }

    return gaps;
  }
}

let defaultProvider: SemrushProvider | null = null;

export function getKeywordResearchProvider(): KeywordResearchProvider {
  if (!defaultProvider) {
    defaultProvider = new SemrushProvider();
  }
  return defaultProvider;
}
