import { describe, it, expect, vi } from "vitest";
import {
  appendVerticalDisclaimer,
  applyForbiddenClaimsGuardrail,
  resolveAutoPublishGate,
  isPieceAwaitingReview,
} from "@workspace/content-engine/verticals/vertical-guardrails";
import { getVerticalPreset, verticalRequiresReview } from "@workspace/content-engine/vertical-presets";

/** Mirrors the exact expression `generateFromContentItem` uses in
 * autopilot-orchestrator.ts to decide approvalStatus — kept here so a change to
 * either side breaks a test instead of silently drifting apart. */
function requiresReviewForGeneratedPiece(vertical: string | null | undefined): boolean {
  return verticalRequiresReview(vertical as never) || !vertical;
}

describe("D2 review gating fails closed on an unknown vertical", () => {
  it("requires review when the org has no vertical set at all", () => {
    expect(requiresReviewForGeneratedPiece(null)).toBe(true);
    expect(requiresReviewForGeneratedPiece(undefined)).toBe(true);
  });

  it("requires review for law and dental", () => {
    expect(requiresReviewForGeneratedPiece("law")).toBe(true);
    expect(requiresReviewForGeneratedPiece("dental")).toBe(true);
  });

  it("does not require review for a known low-risk vertical", () => {
    expect(requiresReviewForGeneratedPiece("software")).toBe(false);
    expect(requiresReviewForGeneratedPiece("marketing")).toBe(false);
  });

  it("does not require review for an explicitly-chosen 'other' vertical", () => {
    expect(requiresReviewForGeneratedPiece("other")).toBe(false);
  });
});

describe("applyForbiddenClaimsGuardrail", () => {
  it("blocks a law draft with a forbidden claim from silently passing", async () => {
    const draft = "We guarantee a guaranteed outcome for every client.";
    const regenerate = vi.fn().mockResolvedValue(null); // simulate regen failing/unavailable

    const result = await applyForbiddenClaimsGuardrail(draft, "law", regenerate);

    // Never silently passed: hits are surfaced, not swallowed.
    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits.some((h) => h.claim === "guaranteed outcome")).toBe(true);
    expect(result.body).toBe(draft);
    expect(result.regenerated).toBe(false);
  });

  it("retries once with the offending claims named, and clears hits when the retry fixes it", async () => {
    const draft = "We offer a guaranteed outcome.";
    const regenerate = vi.fn().mockImplementation(async (hits: { claim: string }[]) => {
      expect(hits.map((h) => h.claim)).toContain("guaranteed outcome");
      return "Outcomes vary by case and we cannot promise a specific result.";
    });

    const result = await applyForbiddenClaimsGuardrail(draft, "law", regenerate);

    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(result.regenerated).toBe(true);
    expect(result.hits).toHaveLength(0);
    expect(result.body).not.toContain("guaranteed outcome");
  });

  it("keeps whatever survives the retry attached, never dropping it", async () => {
    const draft = "This procedure is painless and risk-free.";
    // Regeneration only fixes one of the two dental forbidden claims.
    const regenerate = vi.fn().mockResolvedValue("This procedure is painless for most patients.");

    const result = await applyForbiddenClaimsGuardrail(draft, "dental", regenerate);

    expect(result.regenerated).toBe(true);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]?.claim).toBe("painless");
  });

  it("still guards non-YMYL verticals (they have forbidden claims too, just no review gate)", async () => {
    const draft = "We are the best software firm around, fully automated and bug-free.";
    const regenerate = vi.fn().mockResolvedValue(null);
    const result = await applyForbiddenClaimsGuardrail(draft, "software", regenerate);
    expect(result.hits.length).toBeGreaterThan(0);
    expect(regenerate).toHaveBeenCalledTimes(1);
  });
});

describe("appendVerticalDisclaimer", () => {
  it("appends the disclaimer for law", () => {
    const body = appendVerticalDisclaimer("Article body.", "law");
    expect(body).toContain(getVerticalPreset("law").disclaimer);
  });

  it("appends the disclaimer for dental", () => {
    const body = appendVerticalDisclaimer("Article body.", "dental");
    expect(body).toContain(getVerticalPreset("dental").disclaimer);
  });

  it("does not append anything for software (no disclaimer defined)", () => {
    const body = appendVerticalDisclaimer("Article body.", "software");
    expect(body).toBe("Article body.");
  });

  it("is idempotent — does not double-append on a second pass", () => {
    const once = appendVerticalDisclaimer("Article body.", "law");
    const twice = appendVerticalDisclaimer(once, "law");
    expect(twice).toBe(once);
  });
});

describe("resolveAutoPublishGate", () => {
  it("fails closed when the vertical cannot be determined", () => {
    const result = resolveAutoPublishGate(null, true);
    expect(result.allowed).toBe(false);
    expect(result.requiresReview).toBe(true);
    expect(result.reason).toMatch(/fail(ing)? closed/i);
  });

  it("fails closed on undefined vertical too", () => {
    const result = resolveAutoPublishGate(undefined, true);
    expect(result.allowed).toBe(false);
  });

  it("blocks auto-publish for law regardless of autopilot settings", () => {
    expect(resolveAutoPublishGate("law", true).allowed).toBe(false);
    expect(resolveAutoPublishGate("law", false).allowed).toBe(false);
  });

  it("blocks auto-publish for dental regardless of autopilot settings", () => {
    expect(resolveAutoPublishGate("dental", true).allowed).toBe(false);
  });

  it("defers to autopilot settings for a known low-risk vertical", () => {
    expect(resolveAutoPublishGate("software", true).allowed).toBe(true);
    expect(resolveAutoPublishGate("software", false).allowed).toBe(false);
    expect(resolveAutoPublishGate("marketing", true).allowed).toBe(true);
  });

  it("treats an explicitly-chosen 'other' vertical as low-risk, not unknown", () => {
    const result = resolveAutoPublishGate("other", true);
    expect(result.allowed).toBe(true);
    expect(result.requiresReview).toBe(false);
  });
});

describe("isPieceAwaitingReview — the auto-publish hold", () => {
  it("holds a piece marked pending_review", () => {
    expect(isPieceAwaitingReview({ approvalStatus: "pending_review", pieceMetadata: null })).toBe(true);
  });

  it("holds a piece whose metadata still carries requiresReview", () => {
    expect(isPieceAwaitingReview({ approvalStatus: "draft", pieceMetadata: { requiresReview: true } })).toBe(true);
  });

  it("holds on either signal alone, so a row written by an older path is still caught", () => {
    expect(isPieceAwaitingReview({ approvalStatus: "pending_review", pieceMetadata: { requiresReview: false } })).toBe(true);
    expect(isPieceAwaitingReview({ approvalStatus: "approved", pieceMetadata: { requiresReview: true } })).toBe(true);
  });

  it("releases a piece once approval cleared both signals", () => {
    expect(isPieceAwaitingReview({ approvalStatus: "approved", pieceMetadata: { requiresReview: false } })).toBe(false);
    expect(isPieceAwaitingReview({ approvalStatus: "draft", pieceMetadata: null })).toBe(false);
  });

  it("does not hold on missing fields, so unregulated verticals still auto-publish", () => {
    expect(isPieceAwaitingReview({})).toBe(false);
  });
});
