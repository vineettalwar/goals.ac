/**
 * Barrel — re-exports the full public API so all existing importers remain unchanged.
 *
 * Implementation lives in the focused sub-modules:
 *   keyword-opportunity-discover  — discovery, cold-start, template helpers
 *   keyword-opportunity-queue     — queue-to-strategy, auto-queue, queue-and-generate
 *   keyword-opportunity-briefs    — briefs, rank drop, click decline, linked pieces
 *
 * keyword-opportunity-enrich is intentionally NOT re-exported here; it is an
 * internal helper used only by keyword-opportunity-discover.
 */
export * from "./keyword-opportunity-discover";
export * from "./keyword-opportunity-queue";
export * from "./keyword-opportunity-briefs";
