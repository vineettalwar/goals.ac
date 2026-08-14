import { describe, expect, it } from "vitest";
import {
  appendUtmParams,
  stockPhotoAttributionHtml,
  stockPhotoAttributionLinks,
  stockPhotoAttributionMarkdown,
  UNSPLASH_APP_NAME,
} from "./attribution";

describe("appendUtmParams", () => {
  it("adds params to a URL with no existing query string", () => {
    expect(appendUtmParams("https://example.com/x", { a: "1", b: "2" })).toBe(
      "https://example.com/x?a=1&b=2",
    );
  });

  it("merges params onto a URL that already has some", () => {
    expect(appendUtmParams("https://example.com/x?existing=yes", { a: "1" })).toBe(
      "https://example.com/x?existing=yes&a=1",
    );
  });

  it("overwrites a param that already has the same key", () => {
    expect(appendUtmParams("https://example.com/x?a=old", { a: "new" })).toBe(
      "https://example.com/x?a=new",
    );
  });

  it("URL-encodes param values", () => {
    expect(appendUtmParams("https://example.com/x", { a: "goals ac" })).toBe(
      "https://example.com/x?a=goals+ac",
    );
  });
});

describe("stockPhotoAttributionLinks", () => {
  it("returns photographer then platform, in that order, for unsplash", () => {
    const links = stockPhotoAttributionLinks(
      "unsplash",
      "Jane Doe",
      "https://unsplash.com/@jane",
    );

    expect(links).toHaveLength(2);
    expect(links![0]).toEqual({
      text: "Jane Doe",
      url: `https://unsplash.com/@jane?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`,
    });
    expect(links![1]).toEqual({
      text: "Unsplash",
      url: `https://unsplash.com/?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral`,
    });
  });

  it("tags both the photographer link and the platform link with UTM for unsplash", () => {
    const links = stockPhotoAttributionLinks("unsplash", "Jane", "https://unsplash.com/@jane")!;

    for (const link of links) {
      expect(link.url).toContain(`utm_source=${UNSPLASH_APP_NAME}`);
      expect(link.url).toContain("utm_medium=referral");
    }
  });

  it("returns photographer then platform for pexels, with no UTM tagging", () => {
    const links = stockPhotoAttributionLinks(
      "pexels",
      "John Smith",
      "https://www.pexels.com/@john",
    );

    expect(links).toEqual([
      { text: "John Smith", url: "https://www.pexels.com/@john" },
      { text: "Pexels", url: "https://www.pexels.com/" },
    ]);
  });

  it("returns null for an unrecognized provider rather than fabricating a credit", () => {
    expect(stockPhotoAttributionLinks("custom-upload", "Someone", "https://example.com")).toBeNull();
  });

  it("returns null for an empty provider string", () => {
    expect(stockPhotoAttributionLinks("", "Someone", "https://example.com")).toBeNull();
  });
});

describe("stockPhotoAttributionMarkdown", () => {
  it("formats as an italic paragraph with two markdown links", () => {
    const markdown = stockPhotoAttributionMarkdown(
      "unsplash",
      "Jane Doe",
      "https://unsplash.com/@jane",
    );

    expect(markdown).toBe(
      `*Photo by [Jane Doe](https://unsplash.com/@jane?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral) on [Unsplash](https://unsplash.com/?utm_source=${UNSPLASH_APP_NAME}&utm_medium=referral)*`,
    );
  });

  it("returns null for an unrecognized provider", () => {
    expect(stockPhotoAttributionMarkdown("dalle", "AI", "https://example.com")).toBeNull();
  });
});

describe("stockPhotoAttributionHtml", () => {
  it("formats as real anchor tags for the WordPress media caption", () => {
    const html = stockPhotoAttributionHtml("pexels", "John Smith", "https://www.pexels.com/@john");

    expect(html).toBe(
      'Photo by <a href="https://www.pexels.com/@john">John Smith</a> on <a href="https://www.pexels.com/">Pexels</a>',
    );
  });

  it("HTML-escapes a photographer name containing special characters", () => {
    const html = stockPhotoAttributionHtml(
      "unsplash",
      'Jane "J." Doe & Co',
      "https://unsplash.com/@jane",
    );

    expect(html).toContain("Jane &quot;J.&quot; Doe &amp; Co");
    expect(html).not.toContain('"J."');
  });

  it("returns null for an unrecognized provider", () => {
    expect(stockPhotoAttributionHtml("custom-upload", "Someone", "https://example.com")).toBeNull();
  });
});
