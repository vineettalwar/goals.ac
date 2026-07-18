import { describe, expect, it } from "vitest";
import { stripInfographicMarkers } from "./infographic-template";

describe("stripInfographicMarkers", () => {
  it("removes fence comments and keeps the callout", () => {
    const raw = `<!-- goals-ac-infographic -->

### At a glance

> **Title**

<!-- /goals-ac-infographic -->`;
    expect(stripInfographicMarkers(raw)).toBe(`### At a glance

> **Title**`);
    expect(stripInfographicMarkers(raw)).not.toContain("<!--");
  });
});
