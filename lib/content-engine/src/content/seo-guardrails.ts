/**
 * SEO quality guardrails that go beyond structural counting: keyword density,
 * title/meta uniqueness, and alt-text coverage quality. These are pure functions
 * that take comparison data (existing titles, a target keyword) from the caller
 * rather than reaching into a database themselves, so publish-readiness.ts can
 * stay side-effect free while still checking things that cause real ranking
 * damage (over-optimization, cannibalizing titles, alt text that is present but
 * useless).
 *
 * No I/O, no network, no DB.
 */
import { stripMarkdownForProse } from "./ai-writing-rules";

export type KeywordDensityReport = {
  keyword: string;
  occurrences: number;
  wordCount: number;
  densityPercent: number;
  verdict: "under" | "ok" | "over";
};

/**
 * Density bands are heuristics, not a documented Google threshold (Google has never
 * published a density target). They are picked from long-standing practitioner
 * consensus and from what a spot check of stuffed vs. natural articles looks like:
 * - Below 0.5% the target phrase barely appears in an article ostensibly about it,
 *   which suggests the draft drifted off-topic or the keyword was bolted on late.
 * - Above 3% the phrase is repeating often enough that a human editor would notice
 *   it reads as stuffed, and it is in the range that historically drew manual or
 *   algorithmic over-optimization penalties.
 * Anything between is treated as fine. These numbers can move if real ranking data
 * says otherwise; treat them as a starting point, not gospel.
 */
const DENSITY_UNDER_THRESHOLD = 0.5;
const DENSITY_OVER_THRESHOLD = 3;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a simple singular/plural variant of a single word for conservative
 * near-variant matching: "guide" <-> "guides", "box" <-> "boxes". This is
 * intentionally shallow. It does NOT do stemming (e.g. "running" -> "run"),
 * does NOT handle synonyms, and does NOT handle irregular plurals ("tooth" /
 * "teeth"). Those all require a real NLP dependency this module deliberately
 * avoids; a plain plural/singular toggle catches the overwhelming majority of
 * "the keyword appears in a slightly different grammatical form" cases in SEO
 * copy without any false-positive risk of matching an unrelated word.
 */
function wordVariants(word: string): string[] {
  const variants = new Set<string>([word]);
  if (word.endsWith("ies") && word.length > 3) {
    variants.add(`${word.slice(0, -3)}y`);
  } else if (word.endsWith("y") && word.length > 1) {
    variants.add(`${word.slice(0, -1)}ies`);
  } else if (word.endsWith("es") && word.length > 2) {
    variants.add(word.slice(0, -2));
    variants.add(word.slice(0, -1));
  } else if (word.endsWith("s") && word.length > 1) {
    variants.add(word.slice(0, -1));
  } else {
    variants.add(`${word}s`);
  }
  return [...variants];
}

/**
 * Measures how densely a target keyword phrase appears in the article's prose.
 * Markdown syntax (links, headings, code) is stripped first via
 * `stripMarkdownForProse` so that URLs and heading hashes never count as words
 * or accidentally contain a false match.
 *
 * The keyword is matched as a whole phrase, case-insensitively, on word
 * boundaries, so a query for "seo" never matches inside "seospam", and a
 * multi-word phrase like "local seo for dentists" only counts when the words
 * appear in that order and adjacency. The last word of the phrase is matched
 * with a conservative singular/plural variant (see wordVariants) so "local seo
 * for dentist" and "local seo for dentists" both count.
 *
 * Deliberately NOT handled: stemming ("optimizing" will not match "optimize"),
 * synonyms ("dental SEO" will not match "SEO for dentists"), and reordered
 * phrases. Callers who need that should normalize the keyword themselves
 * before calling this.
 */
export function analyzeKeywordDensity(bodyMarkdown: string, keyword: string): KeywordDensityReport {
  const prose = stripMarkdownForProse(bodyMarkdown);
  const words = prose.length === 0 ? [] : prose.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const trimmedKeyword = keyword.trim();
  const keywordWords = trimmedKeyword.split(/\s+/).filter(Boolean);

  let occurrences = 0;
  if (keywordWords.length > 0 && wordCount > 0) {
    const leadWords = keywordWords.slice(0, -1).map(escapeRegExp);
    const lastVariants = wordVariants(keywordWords[keywordWords.length - 1]!.toLowerCase()).map(escapeRegExp);
    const lastAlternation = lastVariants.length > 1 ? `(?:${lastVariants.join("|")})` : lastVariants[0];
    const phrasePattern = [...leadWords, lastAlternation].join("\\s+");
    const pattern = new RegExp(`\\b${phrasePattern}\\b`, "gi");
    occurrences = (prose.match(pattern) ?? []).length;
  }

  const densityPercent = wordCount === 0 ? 0 : (occurrences / wordCount) * 100;
  const verdict: KeywordDensityReport["verdict"] =
    occurrences === 0 || densityPercent < DENSITY_UNDER_THRESHOLD
      ? "under"
      : densityPercent > DENSITY_OVER_THRESHOLD
        ? "over"
        : "ok";

  return {
    keyword: trimmedKeyword,
    occurrences,
    wordCount,
    densityPercent,
    verdict,
  };
}

export type TitleSimilarity = {
  existingTitle: string;
  similarity: number;
};

const DEFAULT_TITLE_SIMILARITY_THRESHOLD = 0.8;

/**
 * Normalizes a title for comparison: lowercase, strip punctuation down to
 * word characters and spaces, collapse whitespace. This makes "Local SEO:
 * The Full Guide!" and "local seo the full guide" compare as identical token
 * sets.
 */
function normalizeTitleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Jaccard similarity (intersection over union) of the two titles' token sets.
 * Chosen over edit distance because title cannibalization is about word
 * overlap and reordering ("Best Local SEO Tips" vs "Local SEO Tips: The
 * Best") rather than character-level closeness, and it needs no dependency.
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Finds existing titles that overlap enough with a new title to risk
 * self-cannibalization in search results. Threshold defaults to 0.8 (80%
 * token overlap): high enough that two articles which merely share a topic
 * ("Local SEO for Dentists" and "Local SEO for Lawyers") do not flag, but low
 * enough to catch a near-duplicate rename ("Local SEO Guide for Dentists in
 * 2026" vs "Local SEO Guide for Dentists (2026)"). This is a heuristic
 * starting point, tune it against real title pairs if it proves noisy.
 */
export function findSimilarTitles(
  title: string,
  existingTitles: string[],
  threshold: number = DEFAULT_TITLE_SIMILARITY_THRESHOLD,
): TitleSimilarity[] {
  const tokens = normalizeTitleTokens(title);
  const hits: TitleSimilarity[] = [];
  for (const existingTitle of existingTitles) {
    const similarity = jaccardSimilarity(tokens, normalizeTitleTokens(existingTitle));
    if (similarity >= threshold) {
      hits.push({ existingTitle, similarity });
    }
  }
  return hits.sort((a, b) => b.similarity - a.similarity);
}

export type AltTextCoverage = {
  totalImages: number;
  withAlt: number;
  emptyAlt: string[];
  lowQualityAlt: string[];
  coveragePercent: number;
};

const LOW_QUALITY_ALT_WORD_FLOOR = 3;

/**
 * Parses every Markdown image in the body and grades its alt text. This is
 * distinct from the existing missing_alt_text blocker in publish-readiness.ts,
 * which only catches fully empty alt strings. Here an image counts as "low
 * quality" when its alt text is present but too short to describe the image
 * (fewer than LOW_QUALITY_ALT_WORD_FLOOR words, e.g. "photo") or when the
 * exact same alt string is reused across more than one image in the article
 * (a common lazy pattern like alt="dentist office" on every photo, which
 * gives search engines and screen readers no way to tell the images apart).
 */
export function analyzeAltTextCoverage(bodyMarkdown: string): AltTextCoverage {
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images: { alt: string; url: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(bodyMarkdown)) !== null) {
    images.push({ alt: match[1]!.trim(), url: match[2]!.trim() });
  }

  const totalImages = images.length;
  const emptyAlt = images.filter((image) => image.alt.length === 0).map((image) => image.url);
  const withAlt = totalImages - emptyAlt.length;

  const altCounts = new Map<string, number>();
  for (const image of images) {
    if (image.alt.length === 0) continue;
    const key = image.alt.toLowerCase();
    altCounts.set(key, (altCounts.get(key) ?? 0) + 1);
  }

  const lowQualityAlt: string[] = [];
  for (const image of images) {
    if (image.alt.length === 0) continue;
    const wordCount = image.alt.split(/\s+/).filter(Boolean).length;
    const isDuplicated = (altCounts.get(image.alt.toLowerCase()) ?? 0) > 1;
    if (wordCount < LOW_QUALITY_ALT_WORD_FLOOR || isDuplicated) {
      lowQualityAlt.push(image.url);
    }
  }

  const coveragePercent = totalImages === 0 ? 100 : (withAlt / totalImages) * 100;

  return {
    totalImages,
    withAlt,
    emptyAlt,
    lowQualityAlt,
    coveragePercent,
  };
}
