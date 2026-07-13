import { describe, expect, it } from "vitest";
import { queueOpportunityErrorMessage } from "./keyword-opportunity-ui";

describe("queueOpportunityErrorMessage", () => {
  it("maps missing strategy to actionable copy", () => {
    expect(queueOpportunityErrorMessage("No content strategy found")).toContain(
      "30-day content strategy",
    );
  });

  it("passes through unknown errors", () => {
    expect(queueOpportunityErrorMessage("Rate limited")).toBe("Rate limited");
  });

  it("falls back when empty", () => {
    expect(queueOpportunityErrorMessage()).toBe("Failed to queue");
  });
});
