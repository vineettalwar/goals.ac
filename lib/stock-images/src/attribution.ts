/**
 * Photo attribution required by Unsplash's and Pexels's API guidelines.
 *
 * goals.ac calls both APIs with a single platform-wide shared key (see
 * .env.example: "all projects share them") — a guideline violation on any
 * one customer's published content risks that key for every customer, so
 * this is not a per-project preference to make optional.
 *
 * Unsplash (the stricter of the two, https://help.unsplash.com/en/articles/2511315)
 * requires crediting both the photographer (linked to their profile) and
 * Unsplash itself (linked to unsplash.com), both carrying
 * utm_source=<app>&utm_medium=referral. Pexels's guideline is simpler: credit
 * the photographer and Pexels, no UTM requirement — satisfied by a plain link.
 */

/**
 * This product's registered application name for Unsplash's utm_source. One
 * named constant so it is one place to correct, not a string scattered across
 * every call site.
 */
export const UNSPLASH_APP_NAME = "goals-ac";

const UNSPLASH_HOME_URL = "https://unsplash.com/";
const PEXELS_HOME_URL = "https://www.pexels.com/";

/** Merge query params onto a URL that may or may not already have some. */
export function appendUtmParams(
  url: string,
  params: Record<string, string>,
): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

function unsplashReferralUrl(url: string): string {
  return appendUtmParams(url, { utm_source: UNSPLASH_APP_NAME, utm_medium: "referral" });
}

export type AttributionLink = { text: string; url: string };

/**
 * The two credit lines a provider's guideline requires, in order: the
 * photographer, then the platform itself. `null` when the provider has no
 * attribution requirement — a future provider, or a user-uploaded custom
 * image with no stock-photo source to credit. Callers must skip attribution
 * entirely on `null` rather than fabricating a credit.
 */
export function stockPhotoAttributionLinks(
  provider: string,
  photographer: string,
  photographerUrl: string,
): AttributionLink[] | null {
  if (provider === "unsplash") {
    return [
      { text: photographer, url: unsplashReferralUrl(photographerUrl) },
      { text: "Unsplash", url: unsplashReferralUrl(UNSPLASH_HOME_URL) },
    ];
  }
  if (provider === "pexels") {
    return [
      { text: photographer, url: photographerUrl },
      { text: "Pexels", url: PEXELS_HOME_URL },
    ];
  }
  return null;
}

/** `*Photo by [Name](url) on [Platform](url)*` — for the article body. */
export function stockPhotoAttributionMarkdown(
  provider: string,
  photographer: string,
  photographerUrl: string,
): string | null {
  const links = stockPhotoAttributionLinks(provider, photographer, photographerUrl);
  if (!links) return null;
  const [person, platform] = links;
  return `*Photo by [${person!.text}](${person!.url}) on [${platform!.text}](${platform!.url})*`;
}

/** `Photo by <a href>Name</a> on <a href>Platform</a>` — for the WordPress media caption. */
export function stockPhotoAttributionHtml(
  provider: string,
  photographer: string,
  photographerUrl: string,
): string | null {
  const links = stockPhotoAttributionLinks(provider, photographer, photographerUrl);
  if (!links) return null;
  const [person, platform] = links;
  const anchor = (link: AttributionLink) =>
    `<a href="${escapeAttr(link.url)}">${escapeAttr(link.text)}</a>`;
  return `Photo by ${anchor(person!)} on ${anchor(platform!)}`;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
