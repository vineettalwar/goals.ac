import { describe, expect, it } from "vitest";
import { visibilityHonestyLabel } from "./search-ui";

describe("visibilityHonestyLabel", () => {
  it("labels missing or simulated mode as Demo / Simulated", () => {
    expect(visibilityHonestyLabel()).toBe("Demo / Simulated");
    expect(visibilityHonestyLabel("simulated")).toBe("Demo / Simulated");
  });

  it("labels live DataForSEO mode as Live", () => {
    expect(visibilityHonestyLabel("live")).toBe("Live");
  });
});
