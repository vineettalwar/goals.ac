import { describe, expect, it } from "vitest";
import {
  parseCsvText,
  validateArticleIdeaRows,
  mapCsvHeaders,
  validateCsvUpload,
  MAX_CSV_ROWS,
} from "./article-ideas-csv";

describe("article ideas CSV import", () => {
  it("parses quoted CSV cells", () => {
    const rows = parseCsvText('keyword,title\n"foo, bar","Guide to foo"');
    expect(rows).toHaveLength(2);
    expect(rows[1]?.[0]).toBe("foo, bar");
    expect(rows[1]?.[1]).toBe("Guide to foo");
  });

  it("validates required columns", () => {
    const parsed = parseCsvText("keyword,title\n,Missing keyword\nvalid kw,Valid title");
    const validated = validateArticleIdeaRows(parsed, mapCsvHeaders(parsed[0]!));
    expect(validated[0]?.errors).toContain("Missing keyword");
    expect(validated[1]?.errors).toHaveLength(0);
  });

  it("rejects oversized uploads", () => {
    const error = validateCsvUpload({
      byteLength: 3 * 1024 * 1024,
      rowCount: 10,
    });
    expect(error).toMatch(/exceeds/);
  });

  it("rejects too many rows", () => {
    const error = validateCsvUpload({
      byteLength: 1000,
      rowCount: MAX_CSV_ROWS + 1,
    });
    expect(error).toMatch(/row limit/);
  });
});
