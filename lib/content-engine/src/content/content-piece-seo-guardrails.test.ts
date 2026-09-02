import { describe, it, expect } from "vitest";
import { finalizeSeoContentPiece } from "@workspace/content-engine/content/content-piece-seo";

/**
 * finalizeSeoContentPiece rebuilds pieceMetadata from the raw model fields and
 * overwrites whatever was there. It runs again on every enhance and re-humanize
 * pass, long after the vertical guardrails decided a law or dental piece needs
 * human review. If the review flag does not survive that rebuild, an unreviewed
 * regulated-vertical article walks straight through the publish gate.
 */
const base = {
  title: "What to do after a workplace injury",
  target_keyword: "workplace injury",
  body_markdown: "Some body copy about the process.",
  meta_description: "A description.",
};

describe("finalizeSeoContentPiece carries the vertical review gate", () => {
  it("keeps requiresReview through a metadata rebuild", () => {
    const out = finalizeSeoContentPiece({
      ...base,
      pieceMetadata: { requiresReview: true },
    });
    expect(out.pieceMetadata.requiresReview).toBe(true);
  });

  it("keeps the disclaimer and the unresolved claim hits for the reviewer", () => {
    const hits = [{ claim: "guaranteed outcome", index: 4, excerpt: "a guaranteed outcome here" }];
    const out = finalizeSeoContentPiece({
      ...base,
      pieceMetadata: {
        requiresReview: true,
        verticalDisclaimer: "This article is general information, not legal advice.",
        forbiddenClaimHits: hits,
        verticalGuardrailRegenerated: true,
      },
    });
    expect(out.pieceMetadata.verticalDisclaimer).toContain("not legal advice");
    expect(out.pieceMetadata.forbiddenClaimHits).toEqual(hits);
    expect(out.pieceMetadata.verticalGuardrailRegenerated).toBe(true);
  });

  it("does not invent a review gate for a piece that never had one", () => {
    const out = finalizeSeoContentPiece({ ...base });
    expect(out.pieceMetadata.requiresReview).toBeUndefined();
  });

  it("preserves an explicit false rather than dropping the decision", () => {
    const out = finalizeSeoContentPiece({ ...base, pieceMetadata: { requiresReview: false } });
    expect(out.pieceMetadata.requiresReview).toBe(false);
  });
});
