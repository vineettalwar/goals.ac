import { describe, expect, it } from "vitest";
import { resolvePrimaryBlogDestination, resolvePrimaryEspDestination } from "./cms-platform-keys";

describe("resolvePrimaryBlogDestination", () => {
  it("prefers an explicitly connected platform, else first connected in priority order", () => {
    expect(resolvePrimaryBlogDestination({})).toBeNull();
    expect(resolvePrimaryBlogDestination({ ghost: { apiUrl: "https://g", adminApiKey: "k" } })).toBe("ghost");
    expect(
      resolvePrimaryBlogDestination(
        {
          ghost: { apiUrl: "https://g", adminApiKey: "k" },
          wordpress: { siteUrl: "https://wp" },
        },
        "ghost",
      ),
    ).toBe("ghost");
  });
});

describe("resolvePrimaryEspDestination", () => {
  it("returns the first connected ESP", () => {
    expect(resolvePrimaryEspDestination({})).toBeNull();
    expect(resolvePrimaryEspDestination({ beehiiv: { publicationId: "p", apiKey: "k" } })).toBe("beehiiv");
  });
});
