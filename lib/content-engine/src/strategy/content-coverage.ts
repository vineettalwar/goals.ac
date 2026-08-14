/**
 * Site-aware coverage checks.
 *
 * Two pages chasing one query is cannibalization: both rank worse than either
 * would alone. Before a brief becomes an article, check it against what the
 * site already publishes. When the topic is already covered, refreshing the
 * existing post beats writing a new one — it keeps the URL, the links, and
 * whatever authority the page has already earned.
 *
 * Pure functions only. The caller supplies the published posts (from the CMS
 * site graph) so this module stays testable without a CMS or a database.
 */

/** A published page as it arrives from the CMS site graph. */
export type CoveredPost = {
  url: string;
  title?: string;
  excerpt?: string;
};

export type CoverageVerdict = "clear" | "overlap" | "covered";

export type CoverageMatch = {
  url: string;
  title: string;
  /** Share of the query's meaningful words already in the post title, 0–1. */
  score: number;
};

export type CoverageResult = {
  verdict: CoverageVerdict;
  /** Best match above the overlap threshold, if any. */
  match: CoverageMatch | null;
  /** Other related posts, strongest first — internal link candidates. */
  related: CoverageMatch[];
};

/**
 * Treated as noise when comparing a query to a title. Deliberately short:
 * over-stripping makes unrelated titles look alike, which is the failure that
 * matters here (a false "covered" silently blocks legitimate content).
 */
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "best",
  "by",
  "for",
  "from",
  "guide",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "top",
  "vs",
  "what",
  "when",
  "where",
  "which",
  "why",
  "with",
  "your",
]);

/** A query is "covered" at or above this title-overlap score. */
export const COVERED_THRESHOLD = 0.8;
/** Below "covered" but at or above this, the topics overlap enough to flag. */
export const OVERLAP_THRESHOLD = 0.5;
/** Weak matches at or above this are still worth linking to. */
export const RELATED_THRESHOLD = 0.25;

const DEFAULT_RELATED_LIMIT = 3;

/** Split text into lowercase content words, dropping stopwords and short tokens. */
export function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

/**
 * Floor for a word's weight, so a word common to every title still counts for
 * something. Without a floor, a single-topic blog would score every query
 * against every post at zero.
 */
const MIN_WORD_WEIGHT = 0.3;

/**
 * Weight each word by how rare it is across the site's titles.
 *
 * A word in most titles carries little signal — on a WordPress blog, matching
 * "wordpress" says nothing about whether two posts compete. Without this, a
 * two-word query sharing only the brand word scores 0.5 and gets flagged as a
 * collision against every post on the site.
 */
export function buildWordWeights(posts: readonly CoveredPost[]): Map<string, number> {
  const weights = new Map<string, number>();
  const total = posts.length;
  if (total === 0) return weights;

  const docFrequency = new Map<string, number>();
  for (const post of posts) {
    for (const word of new Set(contentWords(post.title ?? ""))) {
      docFrequency.set(word, (docFrequency.get(word) ?? 0) + 1);
    }
  }

  for (const [word, count] of docFrequency) {
    weights.set(word, MIN_WORD_WEIGHT + (1 - MIN_WORD_WEIGHT) * (1 - count / total));
  }
  return weights;
}

/**
 * How much of `query` the `post` already covers, 0–1.
 *
 * Asymmetric on purpose: this asks "is the query's topic already handled",
 * not "are these two texts similar". A long post covering a short query
 * should score high, which a symmetric measure would not give.
 *
 * The title carries the topic, so it scores in full. The excerpt only
 * half-counts a word the title missed — supporting evidence, not proof.
 *
 * Pass `weights` from `buildWordWeights` to discount words common across the
 * site. Without it every word counts equally.
 */
export function coverageScore(
  query: string,
  post: CoveredPost,
  weights?: ReadonlyMap<string, number>,
): number {
  const queryWords = new Set(contentWords(query));
  if (queryWords.size === 0) return 0;

  const titleWords = new Set(contentWords(post.title ?? ""));
  const excerptWords = new Set(contentWords(post.excerpt ?? ""));

  let hits = 0;
  let possible = 0;
  for (const word of queryWords) {
    const weight = weights?.get(word) ?? 1;
    possible += weight;
    if (titleWords.has(word)) hits += weight;
    else if (excerptWords.has(word)) hits += weight * 0.5;
  }

  return possible === 0 ? 0 : hits / possible;
}

/**
 * Check a target query against the site's published posts.
 *
 * Returns the strongest match plus other related posts, so a caller can both
 * block a duplicate and seed internal links from the same pass.
 */
export function checkCoverage(
  query: string,
  posts: readonly CoveredPost[],
  options?: { relatedLimit?: number },
): CoverageResult {
  const relatedLimit = options?.relatedLimit ?? DEFAULT_RELATED_LIMIT;
  const weights = buildWordWeights(posts);

  const scored = posts
    .filter((post) => post.url)
    .map((post) => ({
      url: post.url,
      title: post.title?.trim() || post.url,
      score: coverageScore(query, post, weights),
    }))
    .filter((candidate) => candidate.score >= RELATED_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));

  const best = scored[0];
  if (!best || best.score < OVERLAP_THRESHOLD) {
    return { verdict: "clear", match: null, related: scored.slice(0, relatedLimit) };
  }

  return {
    verdict: best.score >= COVERED_THRESHOLD ? "covered" : "overlap",
    match: best,
    related: scored.slice(1, relatedLimit + 1),
  };
}

/** Internal link targets for a query, strongest first. */
export function internalLinkTargets(
  query: string,
  posts: readonly CoveredPost[],
  limit = DEFAULT_RELATED_LIMIT,
): CoverageMatch[] {
  const { match, related } = checkCoverage(query, posts, { relatedLimit: limit });
  const targets = match ? [match, ...related] : related;
  return targets.slice(0, limit);
}

/** One-line explanation for a flagged brief, for the UI and the prompt. */
export function coverageReason(result: CoverageResult): string | null {
  if (!result.match) return null;
  if (result.verdict === "covered") {
    return `Already covered by "${result.match.title}" — refresh that post instead of publishing a second page for the same query.`;
  }
  if (result.verdict === "overlap") {
    return `Overlaps "${result.match.title}" — narrow the angle so the two pages do not compete.`;
  }
  return null;
}
