import type { HumanizableContentPiece } from "./types";

export function extractHeadings(markdown: string): string[] {
  return markdown.split("\n").filter((line) => /^#{2,3}\s/.test(line.trim()));
}

export function extractLinkUrls(markdown: string): string[] {
  const urls: string[] = [];
  const regex = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const SECONDARY_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "with",
  "your",
  "our",
  "how",
  "what",
  "why",
  "when",
  "from",
  "into",
  "about",
  "guide",
  "best",
  "top",
]);

export function normalizeKeywordList(values: string[] | undefined | null): string[] {
  if (!values?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Light related terms from title/body when metadata has no secondary keywords. */
export function deriveRelatedTerms(title: string, body: string, primaryKeyword: string): string[] {
  const primary = primaryKeyword.trim().toLowerCase();
  const pool = `${title} ${body.slice(0, 400)}`;
  const tokens = pool
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !SECONDARY_STOP_WORDS.has(token));

  const seen = new Set<string>();
  const related: string[] = [];
  for (const token of tokens) {
    if (token === primary || primary.includes(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    related.push(token);
    if (related.length >= 4) break;
  }
  return related;
}

export function resolveSecondaryKeywords(result: HumanizableContentPiece): string[] {
  const fromField = normalizeKeywordList(result.secondary_keywords);
  if (fromField.length > 0) return fromField;

  const fromMeta = normalizeKeywordList(result.pieceMetadata?.secondaryKeywords);
  if (fromMeta.length > 0) return fromMeta;

  return deriveRelatedTerms(result.title, result.body_markdown ?? "", result.target_keyword);
}
