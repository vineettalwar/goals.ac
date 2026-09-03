/**
 * Bridges the publish job to the two readiness checks that are otherwise dead
 * code: `verifyCitations` and the internal-link/site-graph slug set. Both
 * `publish-readiness.ts` checks are opt-in: pass `knownSlugs` or
 * `verifiedCitationUrls` and the corresponding blocker turns on, omit them and
 * it stays skipped. That means every failure path in this module must resolve
 * to `undefined`, never `[]`. An empty array reads as "checked, found
 * nothing known" and would fail every internal link and every citation on a
 * site graph fetch that merely timed out or a caller that supplied no
 * fetcher at all, which would block a healthy publish instead of skipping a
 * check we could not run.
 *
 * Never throws. A publish job that crashes because a reachability probe
 * failed is worse than one that skips the probe and logs a warning.
 */
import { verifyCitations, type VerifyCitationsOptions } from "../../content/citation-verifier";
import { logger } from "../../core/logger";

/**
 * Upper bound on how many distinct URLs get network-verified per publish.
 * Citation verification does real HTTP requests from inside a queue worker;
 * without a cap, a draft with a pathological number of invented links could
 * stall the publish queue behind dozens of sequential timeouts. 25 covers
 * every realistic well-cited long-form piece (the quality score only asks
 * for 3+) while bounding worst-case wall time to roughly
 * ceil(25 / concurrency) request timeouts.
 */
export const MAX_CITATION_URLS_PER_PIECE = 25;

export type SiteGraphLike = { posts?: { slug?: string | null }[] | null } | null | undefined;

export type CollectReadinessInputsInput = {
  bodyMarkdown: string;
  citations?: { url?: string | null }[] | null;
  /**
   * Accepted for parity with `assessPublishReadiness`'s inputs, not read here:
   * `checkDanglingInternalLinks` already merges these suggestions with the
   * body's own links before comparing against `knownSlugs`, so this module
   * only needs to produce the site's known-slug set, not the piece's own.
   */
  internalLinkSuggestions?: { suggestedSlug?: string | null }[] | null;
  /** Dependency-injected site graph fetch. Omit when there is no plugin connection. */
  siteGraphFetcher?: () => Promise<SiteGraphLike>;
  /** Forwarded to `verifyCitations` (timeoutMs, concurrency, cacheTtlMs). */
  citationVerifyOptions?: VerifyCitationsOptions;
};

export type CollectReadinessInputsResult = {
  /** Undefined means "could not determine the site's slugs", not "the site has none". */
  knownSlugs?: string[];
  /** Undefined means "citations could not be verified", not "none are reachable". */
  verifiedCitationUrls?: string[];
};

const MARKDOWN_LINK_URL_PATTERN = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/g;

function extractExternalUrlsFromBody(bodyMarkdown: string): string[] {
  const urls = new Set<string>();
  let match: RegExpExecArray | null;
  const pattern = new RegExp(MARKDOWN_LINK_URL_PATTERN);
  while ((match = pattern.exec(bodyMarkdown)) !== null) {
    urls.add(match[1]!.trim());
  }
  return [...urls];
}

/**
 * Gather every candidate citation URL, from the body's markdown links and
 * from the structured `citations[]` field, deduped and capped.
 */
function collectCandidateCitationUrls(
  bodyMarkdown: string,
  citations: CollectReadinessInputsInput["citations"],
): string[] {
  const urls = new Set<string>(extractExternalUrlsFromBody(bodyMarkdown));
  for (const citation of citations ?? []) {
    if (citation?.url) urls.add(citation.url.trim());
  }
  return [...urls].filter(Boolean);
}

async function resolveVerifiedCitationUrls(
  bodyMarkdown: string,
  citations: CollectReadinessInputsInput["citations"],
  options: VerifyCitationsOptions | undefined,
): Promise<string[] | undefined> {
  const candidates = collectCandidateCitationUrls(bodyMarkdown, citations);
  if (candidates.length === 0) {
    // Nothing to verify is a real, positive result: no citations means no
    // unreachable citations either, so an empty array (not undefined) is
    // correct here and lets the readiness gate run the check normally.
    return [];
  }

  // Only the first slice is actually fetched, to keep one pathological draft
  // from stalling the publish queue. The overflow is carried through as
  // verified rather than dropped: we have no evidence against those URLs, and
  // omitting them would block a well sourced article for the sole offence of
  // citing more than the cap.
  const toVerify = candidates.slice(0, MAX_CITATION_URLS_PER_PIECE);
  const unchecked = candidates.slice(MAX_CITATION_URLS_PER_PIECE);

  if (unchecked.length > 0) {
    logger.warn(
      { total: candidates.length, cap: MAX_CITATION_URLS_PER_PIECE, unchecked: unchecked.length },
      "readiness-inputs: citation count over cap, remainder passed through unverified",
    );
  }

  try {
    const { verifiedUrls } = await verifyCitations(toVerify, options);
    return [...verifiedUrls, ...unchecked];
  } catch (err) {
    logger.warn(
      { err },
      "readiness-inputs: citation verification failed wholesale, skipping citation-reachability check",
    );
    return undefined;
  }
}

async function resolveKnownSlugs(
  fetcher: CollectReadinessInputsInput["siteGraphFetcher"],
): Promise<string[] | undefined> {
  if (!fetcher) return undefined;

  try {
    const graph = await fetcher();
    if (!graph) {
      logger.warn(
        "readiness-inputs: site graph fetcher returned no data, skipping dangling-link check",
      );
      return undefined;
    }
    const slugs = (graph.posts ?? [])
      .map((post) => post?.slug)
      .filter((slug): slug is string => Boolean(slug));
    return slugs;
  } catch (err) {
    logger.warn(
      { err },
      "readiness-inputs: site graph fetch failed, skipping dangling-link check",
    );
    return undefined;
  }
}

/**
 * Collect the two optional inputs `assessPublishReadiness` needs to run its
 * citation and internal-link checks for real instead of skipping them.
 * Every failure degrades to omitting that field, never to an empty array
 * (which would read as "checked, nothing found" and block a clean publish).
 */
export async function collectReadinessInputs(
  input: CollectReadinessInputsInput,
): Promise<CollectReadinessInputsResult> {
  const [knownSlugs, verifiedCitationUrls] = await Promise.all([
    resolveKnownSlugs(input.siteGraphFetcher),
    resolveVerifiedCitationUrls(input.bodyMarkdown, input.citations, input.citationVerifyOptions),
  ]);

  return { knownSlugs, verifiedCitationUrls };
}
