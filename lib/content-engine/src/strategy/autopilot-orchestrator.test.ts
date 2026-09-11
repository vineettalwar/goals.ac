import { describe, expect, it } from "vitest";
import { mapStrategyFormatToContentFormat } from "./autopilot-orchestrator";

describe("mapStrategyFormatToContentFormat", () => {
  it("maps MOFU strategy labels to first-class formats", () => {
    expect(mapStrategyFormatToContentFormat("Case Study")).toBe("case_study");
    expect(mapStrategyFormatToContentFormat("comparison")).toBe("comparison");
    expect(mapStrategyFormatToContentFormat("Listicle")).toBe("listicle");
  });

  it("falls back to blog_post for unknown labels", () => {
    expect(mapStrategyFormatToContentFormat("mystery format")).toBe("blog_post");
  });
});
