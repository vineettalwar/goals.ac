export type SerpDevice = "desktop" | "mobile";

export type RankCheckParams = {
  keyword: string;
  targetUrl?: string;
  location?: string;
  language?: string;
  device?: SerpDevice;
};

export type RankCheckResult = {
  position: number | null;
  rankingUrl: string | null;
  serpFeatures: Record<string, unknown>;
  provider: string;
};

export interface SerpProvider {
  readonly id: string;
  isConfigured(): boolean;
  checkRank(params: RankCheckParams): Promise<RankCheckResult>;
}

export class SerpProviderNotConfiguredError extends Error {
  constructor(message = "SERP provider is not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.") {
    super(message);
    this.name = "SerpProviderNotConfiguredError";
  }
}

function normalizeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]?.toLowerCase() ?? url;
  }
}

export function urlsMatch(targetUrl: string, resultUrl: string): boolean {
  const targetHost = normalizeHost(targetUrl);
  const resultHost = normalizeHost(resultUrl);
  if (targetHost !== resultHost) return false;

  try {
    const targetPath = new URL(targetUrl).pathname.replace(/\/$/, "") || "/";
    const resultPath = new URL(resultUrl).pathname.replace(/\/$/, "") || "/";
    if (targetPath === "/") return true;
    return resultPath === targetPath || resultPath.startsWith(`${targetPath}/`);
  } catch {
    return true;
  }
}

export function findRankingPosition(
  organicResults: Array<{ position: number; url: string }>,
  targetUrl?: string,
): { position: number | null; rankingUrl: string | null } {
  if (!targetUrl) {
    return { position: null, rankingUrl: null };
  }

  for (const item of organicResults) {
    if (urlsMatch(targetUrl, item.url)) {
      return { position: item.position, rankingUrl: item.url };
    }
  }

  return { position: null, rankingUrl: null };
}
