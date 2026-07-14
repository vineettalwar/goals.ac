const MAX_COMPETITOR_URLS = 5;

export function hostFromUrl(url: string): string {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return url.trim();
  }
}

export function normalizeCompetitorUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

export function normalizeCompetitorUrlList(urls: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of urls) {
    const url = normalizeCompetitorUrl(raw);
    if (!url) continue;
    const host = hostFromUrl(url);
    if (seen.has(host)) continue;
    seen.add(host);
    normalized.push(url);
    if (normalized.length >= MAX_COMPETITOR_URLS) break;
  }

  return normalized;
}
