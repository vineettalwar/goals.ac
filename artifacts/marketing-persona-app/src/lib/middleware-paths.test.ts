import { describe, expect, it } from "vitest";
import {
  isAppShellPath,
  isPublicMarketingIntegrationsPath,
  isPublicPath,
} from "./middleware-paths";

describe("isPublicPath", () => {
  it("treats marketing legal pages as public (no platform-status soft-nav tax)", () => {
    expect(isPublicPath("/terms")).toBe(true);
    expect(isPublicPath("/privacy")).toBe(true);
    expect(isPublicPath("/imprint")).toBe(true);
    expect(isPublicPath("/about")).toBe(true);
    expect(isPublicPath("/features")).toBe(true);
    expect(isPublicPath("/")).toBe(true);
  });

  it("keeps app and admin gated", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/projects")).toBe(false);
    expect(isPublicPath("/integrations/ai")).toBe(false);
    expect(isPublicPath("/admin")).toBe(false);
    expect(isPublicPath("/api/website-projects")).toBe(false);
    expect(isAppShellPath("/integrations/ai")).toBe(true);
  });

  it("keeps public CMS landers public", () => {
    expect(isPublicMarketingIntegrationsPath("/integrations")).toBe(true);
    expect(isPublicMarketingIntegrationsPath("/integrations/wordpress")).toBe(true);
    expect(isPublicMarketingIntegrationsPath("/integrations/ai")).toBe(false);
  });
});
