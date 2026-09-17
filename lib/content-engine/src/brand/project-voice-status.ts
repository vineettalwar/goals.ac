/** User opted out of waiting for the brand scrape. */
export const BRAND_SCRAPE_SKIPPED = "skipped";

export function scrapeStatusIsSettled(status: string | null | undefined): boolean {
  return status === "done" || status === "failed" || status === BRAND_SCRAPE_SKIPPED;
}
