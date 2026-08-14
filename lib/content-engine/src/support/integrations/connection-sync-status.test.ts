import { describe, expect, it } from "vitest";
import { classifySyncError } from "./connection-sync-status";

describe("classifySyncError", () => {
  it("classifies a 401 as an auth error", () => {
    const result = classifySyncError(
      new Error("GSC Search Analytics failed (401): invalid_token"),
    );

    expect(result.status).toBe("auth_error");
  });

  it("classifies a 403 as an auth error", () => {
    const result = classifySyncError(new Error("GA4 runReport failed (403): insufficient scope"));

    expect(result.status).toBe("auth_error");
  });

  it("classifies a 500 as a generic error, not an auth error", () => {
    const result = classifySyncError(new Error("GA4 runReport failed (500): internal error"));

    expect(result.status).toBe("error");
  });

  it("classifies a 429 rate limit as a generic error", () => {
    const result = classifySyncError(new Error("GSC Search Analytics failed (429): quota exceeded"));

    expect(result.status).toBe("error");
  });

  it("classifies a non-HTTP failure (network error) as a generic error", () => {
    const result = classifySyncError(new Error("fetch failed: ECONNRESET"));

    expect(result.status).toBe("error");
  });

  it("does not misclassify a status code appearing in the error body, not the prefix", () => {
    // Guards the "(401|403)" match against a body that happens to mention a
    // page or request id containing those digits outside parentheses.
    const result = classifySyncError(new Error("GA4 runReport failed (500): retry after 401ms"));

    expect(result.status).toBe("error");
  });

  it("handles a thrown non-Error value without crashing", () => {
    const result = classifySyncError("plain string failure (401)");

    expect(result.status).toBe("auth_error");
    expect(result.message).toContain("plain string failure");
  });

  it("truncates a very long message", () => {
    const longMessage = "GA4 runReport failed (500): " + "x".repeat(1000);
    const result = classifySyncError(new Error(longMessage));

    expect(result.message.length).toBeLessThanOrEqual(300);
  });

  it("preserves a short message in full", () => {
    const result = classifySyncError(new Error("GSC Search Analytics failed (401): invalid_token"));

    expect(result.message).toBe("GSC Search Analytics failed (401): invalid_token");
  });
});
