import { describe, expect, it } from "vitest";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
  replaceCompetitorUrl,
} from "./competitor-url";

describe("competitor-url", () => {
  it("normalizes bare domains to https URLs", () => {
    expect(normalizeCompetitorUrl("competitor.com")).toBe("https://competitor.com/");
  });

  it("dedupes hosts and caps list length", () => {
    expect(
      normalizeCompetitorUrlList([
        "https://a.com",
        "http://www.a.com/path",
        "b.com",
        "c.com",
        "d.com",
        "e.com",
        "f.com",
      ]),
    ).toEqual([
      "https://a.com/",
      "https://b.com/",
      "https://c.com/",
      "https://d.com/",
      "https://e.com/",
    ]);
  });

  it("extracts hostnames consistently", () => {
    expect(hostFromUrl("www.Example.COM/page")).toBe("example.com");
  });

  it("replaces a listed URL and rejects invalid or duplicate hosts", () => {
    const listed = ["https://syde%20gmbh/", "https://rival.com/"];
    expect(replaceCompetitorUrl(listed, listed[0]!, "https://syde.gmbh")).toEqual({
      ok: true,
      urls: ["https://syde.gmbh/", "https://rival.com/"],
    });
    expect(replaceCompetitorUrl(listed, listed[0]!, "not a url").ok).toBe(false);
    const duplicate = replaceCompetitorUrl(listed, listed[0]!, "https://rival.com");
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.reason).toBe("duplicate");
  });
});
