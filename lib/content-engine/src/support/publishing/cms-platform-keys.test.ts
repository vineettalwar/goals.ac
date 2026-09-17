import { describe, expect, it } from "vitest";
import {
  isCmsConnectReady,
  resolvePrimaryBlogDestination,
  resolvePrimaryEspDestination,
  unreadyCmsConnectKeys,
} from "./cms-platform-keys";

describe("isCmsConnectReady", () => {
  it("defaults to WordPress only and honors an admin-released list", () => {
    expect(isCmsConnectReady("wordpress")).toBe(true);
    expect(isCmsConnectReady("ghost")).toBe(false);
    expect(isCmsConnectReady("ghost", ["wordpress", "ghost"])).toBe(true);
    expect(isCmsConnectReady("beehiiv")).toBe(true);
    expect(unreadyCmsConnectKeys(["wordpress", "ghost", "beehiiv"])).toEqual(["ghost"]);
    expect(unreadyCmsConnectKeys(["wordpress", "ghost"], ["wordpress", "ghost"])).toEqual([]);
  });
});

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
