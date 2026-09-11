import { describe, expect, it } from "vitest";
import { buildStepSequence } from "./create-content-modal-logic";

describe("buildStepSequence", () => {
  it("express create is format → keyword → review → generating", () => {
    expect(buildStepSequence("create", "blog_post", {}, false, "express")).toEqual([
      "path",
      "format",
      "keyword",
      "review",
      "generating",
    ]);
  });

  it("express with brief skip starts at keyword", () => {
    expect(buildStepSequence("create", "guide", {}, true, "express")).toEqual([
      "keyword",
      "review",
      "generating",
    ]);
  });

  it("full create still includes competitors and angle", () => {
    const steps = buildStepSequence("create", "blog_post", {}, false, "full");
    expect(steps).toContain("competitors");
    expect(steps).toContain("angle");
    expect(steps).toContain("planned-date");
  });
});
