import { describe, expect, it } from "vitest";
import { escapeHtml, inlineToHtml } from "./markdown-inline";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")</script> & more`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("plain text, no markup")).toBe("plain text, no markup");
  });
});

describe("inlineToHtml — emphasis (existing behavior, unchanged)", () => {
  it("converts bold, italic, and inline code", () => {
    expect(inlineToHtml("**bold** and *italic* and `code`")).toBe(
      "<strong>bold</strong> and <em>italic</em> and <code>code</code>",
    );
  });

  it("escapes HTML before applying emphasis", () => {
    expect(inlineToHtml("**<b>bold</b>**")).toBe("<strong>&lt;b&gt;bold&lt;/b&gt;</strong>");
  });
});

describe("inlineToHtml — links", () => {
  it("converts a plain link", () => {
    expect(inlineToHtml("See [our guide](https://example.com/guide).")).toBe(
      'See <a href="https://example.com/guide">our guide</a>.',
    );
  });

  it("HTML-escapes the URL in the href", () => {
    expect(inlineToHtml('[x](https://example.com?a=1&b="2")')).toBe(
      '<a href="https://example.com?a=1&amp;b=&quot;2&quot;">x</a>',
    );
  });

  it("does not let an underscore in the URL trigger italic and corrupt the href", () => {
    // Before the fix, /_(.+?)_/g would match "_maintenance_" inside this URL
    // and wrap part of the href in <em>, breaking the link.
    const result = inlineToHtml("[guide](https://example.com/wordpress_maintenance_plans)");

    expect(result).toBe(
      '<a href="https://example.com/wordpress_maintenance_plans">guide</a>',
    );
    expect(result).not.toContain("<em>");
  });

  it("does not let an asterisk in the URL trigger bold/italic", () => {
    const result = inlineToHtml("[x](https://example.com/path*with*stars)");

    expect(result).toBe('<a href="https://example.com/path*with*stars">x</a>');
    expect(result).not.toContain("<strong>");
    expect(result).not.toContain("<em>");
  });

  it("applies emphasis inside link text", () => {
    expect(inlineToHtml("[**bold link**](https://example.com)")).toBe(
      '<a href="https://example.com"><strong>bold link</strong></a>',
    );
  });

  it("HTML-escapes link text", () => {
    expect(inlineToHtml("[<script>](https://example.com)")).toBe(
      '<a href="https://example.com">&lt;script&gt;</a>',
    );
  });

  it("handles multiple links in the same text, each with correct plain text around it", () => {
    const result = inlineToHtml("Read [one](https://a.com) and also [two](https://b.com) today.");

    expect(result).toBe(
      'Read <a href="https://a.com">one</a> and also <a href="https://b.com">two</a> today.',
    );
  });

  it("formats plain text around a link with emphasis independently", () => {
    const result = inlineToHtml("A **bold** intro, then [a link](https://example.com), then *italic*.");

    expect(result).toBe(
      'A <strong>bold</strong> intro, then <a href="https://example.com">a link</a>, then <em>italic</em>.',
    );
  });

  it("does not treat digit-shaped plain text near a link as a corrupted placeholder", () => {
    // Regression guard for the placeholder-collision bug caught during design:
    // an early implementation used a text placeholder like " 0 " for the
    // first link, which would have collided with ordinary text such as this.
    const result = inlineToHtml("It's rated 5 stars, see [the review](https://example.com).");

    expect(result).toBe(
      'It\'s rated 5 stars, see <a href="https://example.com">the review</a>.',
    );
  });

  it("applies emphasis that spans across a link, not just around it", () => {
    // Regression guard for the bug caught by hand-verification: an earlier
    // implementation processed the plain-text segments before and after each
    // link independently. "*Photo by [Name](url) on [Platform](url)*" has its
    // two `*` markers in different segments — neither segment alone contains
    // a matched pair, so both rendered as literal asterisks instead of <em>.
    // This is exactly the shape the attribution credit line uses.
    const result = inlineToHtml("*Photo by [Jane](https://a.com) on [Unsplash](https://b.com)*");

    expect(result).toBe(
      '<em>Photo by <a href="https://a.com">Jane</a> on <a href="https://b.com">Unsplash</a></em>',
    );
    expect(result).not.toContain("*");
  });

  it("applies bold that spans across a link", () => {
    const result = inlineToHtml("**See [this guide](https://example.com) for more**");

    expect(result).toBe(
      '<strong>See <a href="https://example.com">this guide</a> for more</strong>',
    );
  });

  it("leaves text with no links unaffected", () => {
    expect(inlineToHtml("no links here")).toBe("no links here");
  });

  it("handles an empty link text", () => {
    expect(inlineToHtml("[](https://example.com)")).toBe('<a href="https://example.com"></a>');
  });
});
