import { describe, expect, it } from "vitest";
import { defaultProjectIntegrationsUrl, normalizeReturnUrl } from "./oauth-app-return-url";

describe("normalizeReturnUrl", () => {
  const request = new Request("https://api.goals.ac/api/auth/google-search-console?projectId=12");

  it("returns the project search integrations page when returnUrl is missing", () => {
    expect(normalizeReturnUrl(null, request, 12)).toBe(
      "https://app.goals.ac/projects/12/integrations/search",
    );
    expect(defaultProjectIntegrationsUrl(12)).toBe(
      "https://app.goals.ac/projects/12/integrations/search",
    );
  });

  it("accepts a same-app relative path", () => {
    expect(normalizeReturnUrl("/search/visibility", request, 12)).toBe(
      "https://app.goals.ac/search/visibility",
    );
  });

  it("rejects a foreign origin", () => {
    expect(normalizeReturnUrl("https://evil.example/phish", request, 12)).toBe(
      "https://app.goals.ac/projects/12/integrations/search",
    );
  });
});
