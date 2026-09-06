import { describe, expect, it } from "vitest";
import {
  applyInternalLinksToMarkdown,
  findUnlinkedPhrase,
  isInsideMarkdownLink,
  slugToHref,
  suggestOutboundInternalLinks,
} from "./outbound-internal-links";

describe("slugToHref", () => {
  it("normalizes blog prefix and slashes", () => {
    expect(slugToHref("/blog/WordPress-Maintenance/")).toBe("/wordpress-maintenance");
    expect(slugToHref("foo")).toBe("/foo");
  });
});

describe("isInsideMarkdownLink", () => {
  it("detects text inside an existing link", () => {
    const body = "See [WordPress maintenance](/wordpress-maintenance) today.";
    const idx = body.indexOf("WordPress");
    expect(isInsideMarkdownLink(body, idx)).toBe(true);
  });

  it("allows plain text", () => {
    const body = "WordPress maintenance is hard.";
    expect(isInsideMarkdownLink(body, 0)).toBe(false);
  });
});

describe("findUnlinkedPhrase", () => {
  it("returns exact draft casing", () => {
    expect(findUnlinkedPhrase("Try WordPress Maintenance today.", "wordpress maintenance")).toBe(
      "WordPress Maintenance",
    );
  });

  it("skips already-linked phrases", () => {
    expect(
      findUnlinkedPhrase("Try [WordPress Maintenance](/x) today.", "WordPress Maintenance"),
    ).toBeNull();
  });
});

describe("suggestOutboundInternalLinks", () => {
  const body =
    "# Guide\n\nWordPress maintenance keeps sites safe. Managed hosting helps. Security matters.";

  it("picks phrases that appear in the draft", () => {
    const suggestions = suggestOutboundInternalLinks({
      bodyMarkdown: body,
      candidates: [
        { anchorText: "WordPress maintenance", suggestedSlug: "/blog/wordpress-maintenance" },
        { anchorText: "managed hosting", suggestedSlug: "managed-hosting" },
        { anchorText: "missing phrase", suggestedSlug: "/nope" },
      ],
      limit: 3,
    });
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]!.href).toBe("/wordpress-maintenance");
    expect(suggestions[0]!.matchedPhrase).toBe("WordPress maintenance");
    expect(suggestions[1]!.href).toBe("/managed-hosting");
  });

  it("skips targets already linked and self slug", () => {
    const linked = "See [WordPress maintenance](/wordpress-maintenance) now.";
    expect(
      suggestOutboundInternalLinks({
        bodyMarkdown: linked,
        candidates: [
          { anchorText: "WordPress maintenance", suggestedSlug: "wordpress-maintenance" },
        ],
      }),
    ).toEqual([]);

    expect(
      suggestOutboundInternalLinks({
        bodyMarkdown: body,
        candidates: [
          { anchorText: "WordPress maintenance", suggestedSlug: "wordpress-maintenance" },
        ],
        excludeSlug: "wordpress-maintenance",
      }),
    ).toEqual([]);
  });
});

describe("applyInternalLinksToMarkdown", () => {
  it("wraps first unlinked occurrences", () => {
    const body = "WordPress maintenance and managed hosting both matter.";
    const { markdown, applied } = applyInternalLinksToMarkdown(body, [
      {
        anchorText: "WordPress maintenance",
        href: "/wordpress-maintenance",
        matchedPhrase: "WordPress maintenance",
      },
      {
        anchorText: "managed hosting",
        href: "/managed-hosting",
        matchedPhrase: "managed hosting",
      },
    ]);
    expect(applied).toBe(2);
    expect(markdown).toContain("[WordPress maintenance](/wordpress-maintenance)");
    expect(markdown).toContain("[managed hosting](/managed-hosting)");
  });

  it("is idempotent when links already exist", () => {
    const body = "[WordPress maintenance](/wordpress-maintenance) again.";
    const { markdown, applied } = applyInternalLinksToMarkdown(body, [
      {
        anchorText: "WordPress maintenance",
        href: "/wordpress-maintenance",
        matchedPhrase: "WordPress maintenance",
      },
    ]);
    expect(applied).toBe(0);
    expect(markdown).toBe(body);
  });
});
