import { describe, expect, it } from "vitest";
import {
  databaseToCountryCode,
  extractDomain,
  formatVolume,
  kdToDifficulty,
  parseNumber,
  parseSemrushCsv,
} from "./helpers";
import { sanitizeSemrushErrorMessage, redactSemrushSecrets } from "./http";
import { isSemrushDatabase } from "./constants";

describe("keyword-research-provider helpers", () => {
  it("extracts domain from URLs", () => {
    expect(extractDomain("https://www.Example.com/blog")).toBe("example.com");
    expect(extractDomain("competitor.io")).toBe("competitor.io");
  });

  it("maps keyword difficulty bands", () => {
    expect(kdToDifficulty(20)).toBe("low");
    expect(kdToDifficulty(55)).toBe("medium");
    expect(kdToDifficulty(80)).toBe("high");
  });

  it("formats monthly volume", () => {
    expect(formatVolume(1200)).toBe("1,200/mo");
    expect(formatVolume(0)).toBe("0/mo");
  });

  it("parses Semrush CSV rows", () => {
    const csv = "Ph;Nq;Kd\nseo tools;1200;45\ncontent marketing;800;38";
    const rows = parseSemrushCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.Ph).toBe("seo tools");
    expect(parseNumber(rows[0]?.Nq)).toBe(1200);
  });

  it("validates supported databases", () => {
    expect(isSemrushDatabase("us")).toBe(true);
    expect(isSemrushDatabase("zz")).toBe(false);
  });

  it("maps Semrush database codes to v4 country codes", () => {
    expect(databaseToCountryCode("de")).toBe("DE");
    expect(databaseToCountryCode("uk")).toBe("UK");
    expect(databaseToCountryCode("us")).toBe("US");
  });

  it("redacts API keys from upstream errors", () => {
    const sanitized = sanitizeSemrushErrorMessage("ERROR 403 :: key=supersecret123 invalid");
    expect(sanitized).not.toContain("supersecret123");
    expect(sanitized).toContain("[redacted]");
  });

  it("redacts legacy API URLs that include query-string keys", () => {
    const sanitized = redactSemrushSecrets(
      "fetch failed https://api.semrush.com/?type=domain_domains&key=abc123def456&database=us",
    );
    expect(sanitized).not.toContain("abc123def456");
    expect(sanitized).toContain("[redacted]");
  });
});
