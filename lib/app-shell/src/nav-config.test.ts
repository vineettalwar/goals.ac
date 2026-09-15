import { describe, expect, it } from "vitest";
import { buildNavModel } from "./nav-config";

function labels(model: ReturnType<typeof buildNavModel>): string[] {
  return model.navSections.flatMap((section) => section.items.map((item) => item.label));
}

describe("buildNavModel product surface", () => {
  it("defaults to the full surface so GEO, research, and social stay reachable", () => {
    const shown = labels(buildNavModel({}));

    expect(shown).toEqual(
      expect.arrayContaining(["Social Hub", "GEO Audit", "Research", "Content Studio"]),
    );
  });

  it("keeps the blog path intact on the default surface", () => {
    const shown = labels(buildNavModel({}));

    expect(shown).toEqual(
      expect.arrayContaining(["Dashboard", "Chat", "Projects", "Content Studio", "Content Autopilot", "Search"]),
    );
  });

  it("drops sections left empty by the filter", () => {
    const model = buildNavModel({ surface: "blog_wordpress" });

    expect(model.navSections.every((section) => section.items.length > 0)).toBe(true);
    expect(model.navSections.map((section) => section.label)).not.toContain("Research");
  });

  it("hides social, GEO, and research on the blog surface", () => {
    const shown = labels(buildNavModel({ surface: "blog_wordpress" }));

    expect(shown).not.toContain("Social Hub");
    expect(shown).not.toContain("GEO Audit");
    expect(shown).not.toContain("Research");
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

    expect(labels(partner)).toContain("Clients");
    expect(admin.footerItems.map((item) => item.label)).toContain("Admin");
    expect(admin.footerItems.find((item) => item.label === "Integrations")?.href).toBe(
      "__integrations__",
    );
  });

  it("keeps Search and Strategy as single destinations", () => {
    const items = buildNavModel({}).navSections.flatMap((section) => section.items);
    const search = items.find((item) => item.label === "Search");
    const strategy = items.find((item) => item.label === "Strategy");

    expect(search?.href).toBe("/search/keywords");
    expect(search?.children).toBeUndefined();
    expect(strategy?.href).toBe("/strategy/roadmaps");
    expect(strategy?.children).toBeUndefined();
  });
});
