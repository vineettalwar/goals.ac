/**
 * Picks which published posts should link to a newly published article.
 *
 * A new post starts orphaned. Until something links to it, it inherits none of
 * the authority the site has already earned, and crawlers reach it only through
 * the sitemap. Adding a few contextual links from posts that already discuss
 * the topic is the cheapest ranking lever available.
 *
 * The selection lives here rather than in the CMS plugin so it stays testable
 * and works the same for every platform. The plugin only performs the
 * insertion, and skips anything it cannot place safely.
 */

import { contentWords } from "./content-coverage";

/** A published post as it arrives from the CMS site graph. */
export type LinkSourcePost = {
  id: number;
  url: string;
  title?: string;
  excerpt?: string;
  body?: string;
};

export type InternalLinkPlan = {
  /** Phrase to link. Chosen because it already appears in every selected post. */
  anchorText: string;
  /** Posts to link from, best candidate first. */
  postIds: number[];
};

/** Default number of posts to link from. */
const DEFAULT_LIMIT = 3;

/** Searchable text for a post, lowercased. */
function postText(post: LinkSourcePost): string {
  return [post.title, post.excerpt, post.body].filter(Boolean).join(" ").toLowerCase();
}

/**
 * Normalize whitespace so a phrase spanning a line break still matches the
 * flattened text the site graph returns.
 */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Candidate anchor phrases for a keyword, longest first.
 *
 * The full keyword is the best anchor — it is the most descriptive and the most
 * relevant. When no post contains the full phrase, progressively shorter
 * leading sub-phrases are tried, since a two-word anchor still beats no link.
 * Single words are excluded: a one-word anchor is usually too generic to
 * describe the destination, and generic anchors help neither readers nor
 * crawlers.
 */
export function anchorCandidates(keyword: string): string[] {
  const words = contentWords(keyword);
  const candidates: string[] = [];

  const full = normalize(keyword);
  if (full) candidates.push(full);

  for (let length = words.length; length >= 2; length -= 1) {
    const phrase = words.slice(0, length).join(" ");
    if (phrase && !candidates.includes(phrase)) candidates.push(phrase);
  }

  return candidates;
}

/**
 * Plan internal links for a newly published post.
 *
 * Returns null when no anchor phrase appears in any other post — in that case
 * there is no honest contextual link to add, and forcing one would mean editing
 * a published post to insert a phrase its author never wrote.
 */
export function planInternalLinks(input: {
  /** URL of the newly published post, excluded from its own link sources. */
  targetUrl: string;
  /** Primary keyword of the new post. */
  targetKeyword: string;
  /** Published posts from the site graph. */
  posts: readonly LinkSourcePost[];
  limit?: number;
}): InternalLinkPlan | null {
  const limit = input.limit ?? DEFAULT_LIMIT;
  if (limit <= 0) return null;

  const targetUrl = normalize(input.targetUrl);
  const candidates = input.posts.filter(
    (post) => post.id > 0 && post.url && normalize(post.url) !== targetUrl,
  );
  if (candidates.length === 0) return null;

  const indexed = candidates.map((post) => ({ post, text: normalize(postText(post)) }));

  // Prefer the most descriptive anchor that actually appears somewhere.
  for (const anchorText of anchorCandidates(input.targetKeyword)) {
    const matches = indexed.filter((entry) => entry.text.includes(anchorText));
    if (matches.length === 0) continue;

    return {
      anchorText,
      postIds: matches.slice(0, limit).map((entry) => entry.post.id),
    };
  }

  return null;
}
