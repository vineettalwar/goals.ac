import { describe, expect, it } from "vitest";
import { isProductAppPath, productThemeBootScript } from "./theme-path";

describe("isProductAppPath", () => {
  it("includes chat and admin, excludes marketing", () => {
    expect(isProductAppPath("/chat")).toBe(true);
    expect(isProductAppPath("/clients")).toBe(true);
    expect(isProductAppPath("/admin/users")).toBe(true);
    expect(isProductAppPath("/integrations/ai")).toBe(true);
    expect(isProductAppPath("/integrations/wordpress")).toBe(false);
    expect(isProductAppPath("/features")).toBe(false);
  });
});

describe("productThemeBootScript", () => {
  it("treats /chat as an app path", () => {
    expect(productThemeBootScript()).toContain('"/chat"');
    expect(productThemeBootScript({ marketingStatic: true })).toContain("remove('dark')");
  });
});
