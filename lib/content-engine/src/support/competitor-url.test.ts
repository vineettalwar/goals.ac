import { describe, expect, it } from "vitest";
import {
  hostFromUrl,
  normalizeCompetitorUrl,
  normalizeCompetitorUrlList,
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
});
