import { describe, expect, it } from "vitest";
import { decryptCmsCredentials, parseCmsIntegrationCredentials } from "./cms-credentials-crypto";

describe("parseCmsIntegrationCredentials", () => {
  it("parses D1 JSON text so wordpress is not dropped", () => {
    const stored = JSON.stringify({
      wordpress: {
        connectionType: "api",
        siteUrl: "https://technicaltip.com",
        username: "ed",
        appPassword: "secret",
      },
    });
    const parsed = parseCmsIntegrationCredentials(stored);
    expect(parsed.wordpress?.siteUrl).toBe("https://technicaltip.com");
    expect(decryptCmsCredentials(stored).wordpress?.siteUrl).toBe("https://technicaltip.com");
  });

  it("returns {} for empty / invalid blobs", () => {
    expect(parseCmsIntegrationCredentials(null)).toEqual({});
    expect(parseCmsIntegrationCredentials("not-json")).toEqual({});
  });
});
