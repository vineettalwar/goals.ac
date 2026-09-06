/**
 * Deterministic outbound internal links for Studio drafts.
 *
 * Only wraps phrases that already appear in the body. Inventing anchors would
 * change meaning; publish-time inbound linking lives in internal-link-planner.
 */
import { normalizeInternalSlug } from "./internal-link-validator";

export type OutboundLinkCandidate = {
  anchorText: string;
  suggestedSlug: string;
};

export type OutboundLinkSuggestion = {
  anchorText: string;
  href: string;
  /** Exact substring from the body (preserves draft casing). */
  matchedPhrase: string;
};

const DEFAULT_LIMIT = 3;

export function slugToHref(slug: string): string {
  const normalized = normalizeInternalSlug(slug);
  return normalized ? `/${normalized}` : "/";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when `index` falls inside a markdown link `[…](…)` span. */
export function isInsideMarkdownLink(body: string, index: number): boolean {
  const before = body.slice(0, index);
  const open = before.lastIndexOf("[");
  if (open < 0) return false;
  const closeBefore = before.lastIndexOf("]");
  if (closeBefore > open) return false;
  const fromOpen = body.slice(open);
  return /^\[[^\]]*\]\([^)]*\)/.test(fromOpen);
}

function bodyAlreadyLinksHref(body: string, href: string): boolean {
  const slug = normalizeInternalSlug(href);
  if (!slug) return false;
  const pattern = new RegExp(`\\]\\(\\s*/?(?:blog/)?${escapeRegExp(slug)}/?[?#)]`, "i");
  return pattern.test(body);
}

/**
 * Find the first case-insensitive whole-phrase match that is not already
 * inside a markdown link. Returns the exact draft substring for wrapping.
 */
export function findUnlinkedPhrase(body: string, phrase: string): string | null {
  const needle = phrase.trim();
  if (needle.length < 2) return null;

  const pattern = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const index = match.index;
    if (isInsideMarkdownLink(body, index)) continue;
    return match[0]!;
  }
  return null;
}

/**
 * Pick up to `limit` outbound links from generator/metadata suggestions whose
 * anchor already appears unlinked in the draft.
 */
export function suggestOutboundInternalLinks(input: {
  bodyMarkdown: string;
  candidates: readonly OutboundLinkCandidate[];
  excludeSlug?: string | null;
  limit?: number;
}): OutboundLinkSuggestion[] {
  const limit = input.limit ?? DEFAULT_LIMIT;
  if (limit <= 0 || !input.bodyMarkdown.trim()) return [];

  const exclude = input.excludeSlug ? normalizeInternalSlug(input.excludeSlug) : "";
  const usedHrefs = new Set<string>();
  const usedAnchors = new Set<string>();
  const out: OutboundLinkSuggestion[] = [];

  // Longer anchors first — more specific phrases beat generic ones.
  const ranked = [...input.candidates].sort(
    (a, b) => b.anchorText.trim().length - a.anchorText.trim().length,
  );

  for (const candidate of ranked) {
    if (out.length >= limit) break;
    const anchor = candidate.anchorText?.trim();
    const href = slugToHref(candidate.suggestedSlug ?? "");
    const slug = normalizeInternalSlug(href);
    if (!anchor || !slug) continue;
    if (exclude && slug === exclude) continue;
    if (usedHrefs.has(slug) || bodyAlreadyLinksHref(input.bodyMarkdown, href)) continue;
    const anchorKey = anchor.toLowerCase();
    if (usedAnchors.has(anchorKey)) continue;

    const matchedPhrase = findUnlinkedPhrase(input.bodyMarkdown, anchor);
    if (!matchedPhrase) continue;

    usedHrefs.add(slug);
    usedAnchors.add(anchorKey);
    out.push({ anchorText: anchor, href, matchedPhrase });
  }

  return out;
}

/**
 * Wrap each suggestion's first unlinked phrase as `[phrase](href)`.
 * Re-runs find after each apply so later links see updated positions.
 */
export function applyInternalLinksToMarkdown(
  body: string,
  links: readonly OutboundLinkSuggestion[],
): { markdown: string; applied: number } {
  let markdown = body;
  let applied = 0;

  for (const link of links) {
    if (bodyAlreadyLinksHref(markdown, link.href)) continue;
    const phrase = findUnlinkedPhrase(markdown, link.matchedPhrase || link.anchorText);
    if (!phrase) continue;

    const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`);
    let replaced = false;
    markdown = markdown.replace(pattern, (match, offset: number) => {
      if (replaced || isInsideMarkdownLink(markdown, offset)) return match;
      replaced = true;
      applied += 1;
      return `[${match}](${link.href})`;
    });
  }

  return { markdown, applied };
}
