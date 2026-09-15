import { describe, expect, it } from "vitest";
import { resolveSameOriginReturnUrl } from "./oauth-return-url";

describe("resolveSameOriginReturnUrl", () => {
  it("defaults to the project Search integrations tab", () => {
    expect(resolveSameOriginReturnUrl("http://localhost:3001", 12, null)).toBe(
      "http://localhost:3001/projects/12/integrations/search",
    );
  });

  it("keeps a same-origin path", () => {
    expect(resolveSameOriginReturnUrl("http://localhost:3001", 12, "/search/visibility")).toBe(
      "http://localhost:3001/search/visibility",
    );
  });

  it("drops a foreign origin", () => {
    expect(resolveSameOriginReturnUrl("http://localhost:3001", 12, "https://evil.example/phish")).toBe(
      "http://localhost:3001/projects/12/integrations/search",
    );
  });
});
