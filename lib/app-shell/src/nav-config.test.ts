import { describe, expect, it } from "vitest";
import { buildNavModel } from "./nav-config";

function labels(model: ReturnType<typeof buildNavModel>): string[] {
  return model.navSections.flatMap((section) => section.items.map((item) => item.label));
}

describe("buildNavModel product surface", () => {
  it("defaults to the blog surface and hides social, GEO, and research", () => {
    const shown = labels(buildNavModel({}));

    expect(shown).not.toContain("Social Hub");
    expect(shown).not.toContain("GEO Audit");
    expect(shown).not.toContain("Research");
  });

  it("keeps the blog path intact on the default surface", () => {
    const shown = labels(buildNavModel({}));

    expect(shown).toEqual(
      expect.arrayContaining(["Dashboard", "Projects", "Content Studio", "Autopilot", "Search"]),
    );
  });

  it("drops sections left empty by the filter", () => {
    const model = buildNavModel({});

    expect(model.navSections.every((section) => section.items.length > 0)).toBe(true);
    expect(model.navSections.map((section) => section.label)).not.toContain("Research");
  });

  it("reveals every surface when set to full", () => {
    const shown = labels(buildNavModel({ surface: "full" }));

    expect(shown).toEqual(
      expect.arrayContaining(["Social Hub", "GEO Audit", "Research", "Content Studio"]),
    );
  });

  it("leaves role-driven items unchanged by the surface filter", () => {
    const partner = buildNavModel({ userRole: "user", orgRole: "owner" });
    const admin = buildNavModel({ userRole: "super_admin" });

    expect(labels(partner)).toContain("Partner");
    expect(admin.footerItems.map((item) => item.label)).toContain("Admin");
  });
});
