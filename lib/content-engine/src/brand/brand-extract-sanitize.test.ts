import { describe, expect, it } from "vitest";
import {
  MAX_PROOF_ASSET_CLAIM_LENGTH,
  MAX_PROOF_ASSETS,
  sanitizeProofAssets,
} from "./brand-extract-sanitize";

describe("sanitizeProofAssets", () => {
  it("returns an empty array for non-array input", () => {
    expect(sanitizeProofAssets(undefined)).toEqual([]);
    expect(sanitizeProofAssets(null)).toEqual([]);
    expect(sanitizeProofAssets("not an array")).toEqual([]);
  });

  it("keeps a well-formed asset", () => {
    const result = sanitizeProofAssets([
      {
        kind: "metric",
        claim: "cut onboarding time from 14 days to 3",
        source: "Acme Corp",
        url: "https://example.com/case-studies/acme",
      },
    ]);
    expect(result).toEqual([
      {
        kind: "metric",
        claim: "cut onboarding time from 14 days to 3",
        source: "Acme Corp",
        url: "https://example.com/case-studies/acme",
      },
    ]);
  });

  it("drops assets with an empty or whitespace-only claim", () => {
    const result = sanitizeProofAssets([
      { kind: "metric", claim: "" },
      { kind: "metric", claim: "   " },
      { kind: "metric", claim: "real claim here" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.claim).toBe("real claim here");
  });

  it("drops assets whose kind is not one of the four valid values", () => {
    const result = sanitizeProofAssets([
      { kind: "testimonial", claim: "invalid kind" },
      { kind: "", claim: "empty kind" },
      { claim: "missing kind" },
      { kind: "customer_quote", claim: "valid kind" },
    ]);
    expect(result).toEqual([{ kind: "customer_quote", claim: "valid kind" }]);
  });

  it("drops non-object entries", () => {
    const result = sanitizeProofAssets([null, "string", 42, { kind: "metric", claim: "kept" }]);
    expect(result).toEqual([{ kind: "metric", claim: "kept" }]);
  });

  it("caps the array length at MAX_PROOF_ASSETS", () => {
    const many = Array.from({ length: MAX_PROOF_ASSETS + 10 }, (_, i) => ({
      kind: "named_example" as const,
      claim: `claim ${i}`,
    }));
    const result = sanitizeProofAssets(many);
    expect(result).toHaveLength(MAX_PROOF_ASSETS);
    expect(result[0]?.claim).toBe("claim 0");
  });

  it("trims strings", () => {
    const result = sanitizeProofAssets([
      { kind: "metric", claim: "  padded claim  ", source: "  Padded Source  " },
    ]);
    expect(result[0]?.claim).toBe("padded claim");
    expect(result[0]?.source).toBe("Padded Source");
  });

  it("drops a url that is not a valid http/https URL rather than keeping a malformed one", () => {
    const result = sanitizeProofAssets([
      { kind: "metric", claim: "claim one", url: "not-a-url" },
      { kind: "metric", claim: "claim two", url: "javascript:alert(1)" },
      { kind: "metric", claim: "claim three", url: "ftp://example.com/file" },
      { kind: "metric", claim: "claim four", url: "https://example.com/valid" },
    ]);
    expect(result[0]?.url).toBeUndefined();
    expect(result[1]?.url).toBeUndefined();
    expect(result[2]?.url).toBeUndefined();
    expect(result[3]?.url).toBe("https://example.com/valid");
  });

  it("caps individual claim length so one runaway extraction cannot bloat every future prompt", () => {
    const longClaim = "x".repeat(MAX_PROOF_ASSET_CLAIM_LENGTH + 500);
    const result = sanitizeProofAssets([{ kind: "metric", claim: longClaim }]);
    expect(result[0]?.claim.length).toBeLessThanOrEqual(MAX_PROOF_ASSET_CLAIM_LENGTH);
  });

  it("omits source and url when not provided", () => {
    const result = sanitizeProofAssets([{ kind: "case_study", claim: "bare claim" }]);
    expect(result[0]).toEqual({ kind: "case_study", claim: "bare claim" });
  });
});
