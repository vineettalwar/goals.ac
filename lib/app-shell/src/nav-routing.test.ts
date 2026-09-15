import { describe, expect, it } from "vitest";
import { isNavChildActive, isNavItemActive, resolveNavHref } from "./nav-routing";

const integrationsItem = { label: "Integrations", href: "__integrations__" };

describe("resolveNavHref integrations", () => {
  it("opens project integrations when a project is active", () => {
    expect(resolveNavHref("/search/keywords", 12, "__integrations__")).toBe(
      "/projects/12/integrations",
    );
  });

  it("opens org AI integrations when no project is selected", () => {
    expect(resolveNavHref("/dashboard", null, "__integrations__")).toBe("/integrations/ai");
  });
});

describe("isNavItemActive integrations", () => {
  it("highlights in-app project and org integrations, not marketing landers", () => {
    expect(isNavItemActive("/projects/12/integrations/search", integrationsItem, "")).toBe(true);
    expect(isNavItemActive("/integrations/ai", integrationsItem, "")).toBe(true);
    expect(isNavItemActive("/integrations", integrationsItem, "")).toBe(false);
    expect(isNavItemActive("/integrations/wordpress", integrationsItem, "")).toBe(false);
  });
});

describe("isNavItemActive Projects", () => {
  const projectsItem = { label: "Projects", href: "/projects" };

  it("highlights the list and a project root, not nested studio routes", () => {
    expect(isNavItemActive("/projects", projectsItem, "/projects")).toBe(true);
    expect(isNavItemActive("/projects/12", projectsItem, "/projects")).toBe(true);
    expect(isNavItemActive("/projects/12/content-studio", projectsItem, "/projects")).toBe(false);
    expect(isNavItemActive("/projects/12/daily-five", projectsItem, "/projects")).toBe(false);
  });
});

describe("isNavChildActive", () => {
  it("treats /search as the Keywords child", () => {
    expect(isNavChildActive("/search", { href: "/search/keywords" })).toBe(true);
    expect(isNavChildActive("/search/keywords", { href: "/search/keywords" })).toBe(true);
    expect(isNavChildActive("/search/performance", { href: "/search/keywords" })).toBe(false);
  });

  it("keeps Research Overview exact so sibling routes stay inactive", () => {
    expect(isNavChildActive("/research", { href: "/research", exact: true })).toBe(true);
    expect(isNavChildActive("/research/competitors", { href: "/research", exact: true })).toBe(
      false,
    );
    expect(isNavChildActive("/research/competitors", { href: "/research/competitors" })).toBe(
      true,
    );
  });
});
