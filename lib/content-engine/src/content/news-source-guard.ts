const SOURCE_URL_RE = /https?:\/\/[^\s)\]>]+/gi;

export function extractSourceUrlsFromAngle(angleHint?: string | null): string[] {
  if (!angleHint?.trim()) return [];
  const urls = (angleHint.match(SOURCE_URL_RE) ?? []).map((url) => url.replace(/[.,;)\]]+$/, ""));
  return [...new Set(urls)];
}

/** When editors paste research notes + URLs, block invented news facts at generation time. */
export function buildNewsSourceGuardPrompt(angleHint?: string | null): string {
  const urls = extractSourceUrlsFromAngle(angleHint);
  if (urls.length === 0) return "";
  return `SOURCE URLs (cite ONLY these — do not invent facts, quotes, funding amounts, or statistics not supported by them):
${urls.map((url) => `- ${url}`).join("\n")}`;
}
