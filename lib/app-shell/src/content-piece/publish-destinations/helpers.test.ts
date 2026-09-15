import { describe, expect, it } from "vitest";
import { getConnectedDestinationsForFormat } from "./helpers";

describe("getConnectedDestinationsForFormat", () => {
  it("lists wordpress for blog_post when the snapshot has a wordpress row", () => {
    const destinations = getConnectedDestinationsForFormat("blog_post", {
      wordpress: { connected: true, siteUrl: "https://technicaltip.com" },
    });
    expect(destinations.map((d) => d.id)).toContain("wordpress");
  });

  it("reads wordpress nested under cmsIntegrations (project GET shape)", () => {
    const destinations = getConnectedDestinationsForFormat("blog_post", {
      cmsIntegrations: {
        wordpress: { connected: true, siteUrl: "https://technicaltip.com" },
      },
    });
    expect(destinations.map((d) => d.id)).toContain("wordpress");
  });
});
