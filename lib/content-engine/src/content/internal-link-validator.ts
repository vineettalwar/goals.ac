/**
 * Pure helpers for checking generator-suggested internal links against the
 * real site graph. No I/O here on purpose: fetching the site graph is the
 * caller's job (see `fetchGoalsAcSiteGraph` in `@workspace/connectors`),
 * which keeps this module edge-safe and trivially unit-testable.
 *
 * The output feeds `assessPublishReadiness({ knownSlugs })`.
 */
import type { ContentPieceInternalLink } from "./content-piece-seo";

/**
 * Normalize a slug for comparison: strip a leading/trailing slash, strip a
 * leading `/blog` (or `blog`) segment, lowercase. This is the single place
 * slug comparison happens; every caller in this module routes through it so
 * `/blog/x`, `blog/x`, `/x/`, and `X` all compare equal. Inconsistent
 * normalization here is worse than no check at all, it produces false
 * 404 reports on links that actually resolve.
 */
export function normalizeInternalSlug(raw: string): string {
  let slug = raw.trim().toLowerCase();
  slug = slug.replace(/^\/+/, "").replace(/\/+$/, "");
  slug = slug.replace(/^blog\/+/, "");
  return slug;
}

/**
 * Pull every internal-looking slug out of a body's markdown links (paths
 * starting with `/`) plus the generator's own suggestions. Both sources are
 * normalized before dedup.
 */
export function extractInternalSlugs(
  bodyMarkdown: string,
  suggestions?: Pick<ContentPieceInternalLink, "suggestedSlug">[],
): string[] {
  const slugs = new Set<string>();

  const pattern = /\[[^\]]+\]\((\/[^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(bodyMarkdown)) !== null) {
    const raw = match[1]!.split(/[?#]/)[0]!;
    const normalized = normalizeInternalSlug(raw);
    if (normalized) slugs.add(normalized);
  }

  for (const suggestion of suggestions ?? []) {
    if (!suggestion.suggestedSlug) continue;
    const normalized = normalizeInternalSlug(suggestion.suggestedSlug);
    if (normalized) slugs.add(normalized);
  }

  return [...slugs];
}

/**
 * Split extracted slugs into ones that exist on the destination site and
 * ones that do not. `knownSlugs` is normalized the same way so callers can
 * pass raw site-graph slugs directly.
 */
export function validateInternalLinks(
  slugs: string[],
  knownSlugs: string[],
): { valid: string[]; dangling: string[] } {
  const known = new Set(knownSlugs.map(normalizeInternalSlug));
  const valid: string[] = [];
  const dangling: string[] = [];

  for (const slug of slugs) {
    const normalized = normalizeInternalSlug(slug);
    if (known.has(normalized)) {
      valid.push(normalized);
    } else {
      dangling.push(normalized);
    }
  }

  return { valid, dangling };
}

function tokenize(slug: string): Set<string> {
  return new Set(normalizeInternalSlug(slug).split(/[-/_]+/).filter(Boolean));
}

/**
 * Levenshtein edit distance between two strings, used as the tiebreaker
 * under the token-overlap heuristic below. Deliberately simple: no
 * dependency, single-row DP.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow.push(
        Math.min(
          currentRow[j - 1]! + 1,
          prevRow[j]! + 1,
          prevRow[j - 1]! + cost,
        ),
      );
    }
    prevRow = currentRow;
  }
  return prevRow[b.length]!;
}

/**
 * Suggest the closest known slug for a dangling one, for swapping an invented
 * link to a real post. Ranks by token overlap first (shared hyphen-separated
 * words), falling back to edit distance to break ties or catch near-typos
 * with no shared tokens. Returns null when nothing is close enough to be a
 * plausible swap.
 */
export function nearestSlug(dangling: string, knownSlugs: string[]): string | null {
  const target = normalizeInternalSlug(dangling);
  if (!target || knownSlugs.length === 0) return null;

  const targetTokens = tokenize(target);
  let best: { slug: string; overlap: number; distance: number } | null = null;

  for (const rawKnown of knownSlugs) {
    const known = normalizeInternalSlug(rawKnown);
    if (!known) continue;

    const knownTokens = tokenize(known);
    let overlap = 0;
    for (const token of targetTokens) {
      if (knownTokens.has(token)) overlap += 1;
    }
    const distance = levenshtein(target, known);

    if (
      !best ||
      overlap > best.overlap ||
      (overlap === best.overlap && distance < best.distance)
    ) {
      best = { slug: known, overlap, distance };
    }
  }

  if (!best) return null;

  const maxLen = Math.max(target.length, best.slug.length);
  const closeEnough = best.overlap > 0 || best.distance <= Math.ceil(maxLen * 0.34);
  return closeEnough ? best.slug : null;
}
