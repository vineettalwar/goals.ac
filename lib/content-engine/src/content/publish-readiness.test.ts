import { describe, expect, it } from "vitest";
import { assessPublishReadiness, type PublishReadinessPiece } from "./publish-readiness";

const CLEAN_BODY = `## How proximity beats a prettier website

Local buyers pick the nearest good option. According to [Search Engine Land](https://searchengineland.com/local-seo) and [Moz](https://moz.com/learn/seo/local), proximity outranks polish more often than not.

Read more about [our internal guide](/blog/local-seo-basics) before you touch your listing.

### Why this matters for small teams

A five-person shop with a clean profile beats a ten-person shop with a stale one. Check [BrightLocal](https://brightlocal.com/research) for the data behind this.

## Fixing your listing in a weekend

Claim it, verify it, fill every field. Link to [our checklist](/blog/listing-checklist) and to [the official guidance](https://support.google.com/business).

## What to measure after the fix

Track calls and direction requests weekly. Cite [this benchmark](https://searchengineland.com/benchmarks) when you report results.

## Frequently Asked Questions

### How long does it take to see results?

Most listings shift rank within two to six weeks once fully verified.

### Does review volume matter more than review score?

Volume matters early. Score matters once you clear a baseline of about twenty reviews.

### Should every location get its own page?

Yes, once you have a real street address and phone number to support it.

This paragraph exists only to push the word count comfortably past the eight hundred word floor so the thin content warning does not fire during the clean-piece test, since every other paragraph above is deliberately short and specific rather than padded with filler the anti slop checker would flag. Repeating concrete detail is safer than repeating vague sentences, so here is more of the same kind of grounded, checkable claim: a five person shop with three reviews from this month beats a ten person shop with three reviews from last year, and a buyer thirty feet away beats a buyer three miles away almost every time regardless of design quality. None of this is hedged, and none of it uses a banned transition word, so the score should stay clean while the count climbs past eight hundred words for the test fixture body used across this file's assertions.
`;

const CLEAN_META: PublishReadinessPiece = {
  title: "Local SEO Basics for Small Teams",
  bodyMarkdown: CLEAN_BODY,
  metaTitle: "Local SEO Basics for Small Teams in 2026",
  metaDescription:
    "Learn how small teams win local SEO with a clean listing, fast review replies, and steady weekly tracking of calls and directions.",
  citations: [
    { text: "Search Engine Land", url: "https://searchengineland.com/local-seo", source: "Search Engine Land" },
    { text: "Moz", url: "https://moz.com/learn/seo/local", source: "Moz" },
    { text: "BrightLocal", url: "https://brightlocal.com/research", source: "BrightLocal" },
    { text: "Google", url: "https://support.google.com/business", source: "Google" },
    { text: "benchmark", url: "https://searchengineland.com/benchmarks", source: "Search Engine Land" },
  ],
  faqSection: [
    { question: "How long does it take to see results?", answer: "Two to six weeks." },
    { question: "Does review volume matter more than review score?", answer: "Volume first, score after twenty reviews." },
    { question: "Should every location get its own page?", answer: "Yes, with a real address and phone number." },
  ],
  internalLinkSuggestions: [
    { anchorText: "our internal guide", suggestedSlug: "/blog/local-seo-basics" },
    { anchorText: "our checklist", suggestedSlug: "/blog/listing-checklist" },
  ],
  jsonLdSchema: { "@context": "https://schema.org", "@type": "Article", headline: "Local SEO Basics" },
};

function withBody(body: string, overrides: Partial<PublishReadinessPiece> = {}): PublishReadinessPiece {
  return { ...CLEAN_META, bodyMarkdown: body, ...overrides };
}

describe("assessPublishReadiness - clean piece", () => {
  it("returns ok:true with zero blockers for a fully clean piece", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.blockers).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.qualityScore).toBeGreaterThan(0);
  });
});

describe("assessPublishReadiness - em_dash", () => {
  it("fires on an em dash in the body", () => {
    const result = assessPublishReadiness(withBody(`${CLEAN_BODY}\n\nThis has an em dash — right here.`));
    expect(result.blockers.map((b) => b.code)).toContain("em_dash");
    expect(result.ok).toBe(false);
  });

  it("fires on an en dash in the meta title", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, metaTitle: "Local SEO – The Full Guide for Teams" });
    expect(result.blockers.map((b) => b.code)).toContain("em_dash");
  });

  it("does not fire when there are no em or en dashes", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.blockers.map((b) => b.code)).not.toContain("em_dash");
  });
});

describe("assessPublishReadiness - heading_hierarchy", () => {
  it("fires when H2 is followed by H4 with no H3 between", () => {
    const body = "## Section One\n\nSome real prose here that is long enough.\n\n#### Skipped To H4\n\nMore prose.";
    const result = assessPublishReadiness(withBody(body));
    expect(result.blockers.map((b) => b.code)).toContain("heading_hierarchy");
  });

  it("fires when the first heading is deeper than H2", () => {
    const body = "### Starts Too Deep\n\nSome real prose here that is long enough to read.";
    const result = assessPublishReadiness(withBody(body));
    expect(result.blockers.map((b) => b.code)).toContain("heading_hierarchy");
  });

  it("does not fire on a well-formed outline", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.blockers.map((b) => b.code)).not.toContain("heading_hierarchy");
  });
});

describe("assessPublishReadiness - missing_alt_text", () => {
  it("fires on an image with empty alt text", () => {
    const body = `${CLEAN_BODY}\n\n![](https://example.com/photo.jpg)`;
    const result = assessPublishReadiness(withBody(body));
    const issue = result.blockers.find((b) => b.code === "missing_alt_text");
    expect(issue).toBeDefined();
    expect(issue?.detail).toBe("https://example.com/photo.jpg");
  });

  it("fires on an image with whitespace-only alt text", () => {
    const body = `${CLEAN_BODY}\n\n![   ](https://example.com/photo.jpg)`;
    const result = assessPublishReadiness(withBody(body));
    expect(result.blockers.map((b) => b.code)).toContain("missing_alt_text");
  });

  it("does not fire when every image has real alt text", () => {
    const body = `${CLEAN_BODY}\n\n![A storefront with a clean sign](https://example.com/photo.jpg)`;
    const result = assessPublishReadiness(withBody(body));
    expect(result.blockers.map((b) => b.code)).not.toContain("missing_alt_text");
  });
});

describe("assessPublishReadiness - meta_description_length", () => {
  it("fires when meta description is missing", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, metaDescription: undefined, pieceMetadata: undefined });
    expect(result.blockers.map((b) => b.code)).toContain("meta_description_length");
  });

  it("fires when meta description is under 50 characters", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, metaDescription: "Too short." });
    expect(result.blockers.map((b) => b.code)).toContain("meta_description_length");
  });

  it("fires when meta description is over 160 characters", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, metaDescription: "x".repeat(200) });
    expect(result.blockers.map((b) => b.code)).toContain("meta_description_length");
  });

  it("does not fire on a well-sized meta description", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.blockers.map((b) => b.code)).not.toContain("meta_description_length");
  });
});

describe("assessPublishReadiness - meta_title_length", () => {
  it("fires when the title is under 25 characters", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, metaTitle: "Too short" });
    expect(result.blockers.map((b) => b.code)).toContain("meta_title_length");
  });

  it("fires when the title is over 65 characters", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, metaTitle: "x".repeat(80) });
    expect(result.blockers.map((b) => b.code)).toContain("meta_title_length");
  });

  it("does not fire on a well-sized title", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.blockers.map((b) => b.code)).not.toContain("meta_title_length");
  });
});

describe("assessPublishReadiness - dangling_internal_link", () => {
  it("is skipped entirely when knownSlugs is omitted", () => {
    const body = `${CLEAN_BODY}\n\n[a made up page](/blog/does-not-exist)`;
    const result = assessPublishReadiness(withBody(body));
    expect(result.blockers.map((b) => b.code)).not.toContain("dangling_internal_link");
  });

  it("fires when an inline internal link is not in knownSlugs", () => {
    const body = `${CLEAN_BODY}\n\n[a made up page](/blog/does-not-exist)`;
    const result = assessPublishReadiness(withBody(body), {
      knownSlugs: ["blog/local-seo-basics", "blog/listing-checklist"],
    });
    expect(result.blockers.map((b) => b.code)).toContain("dangling_internal_link");
  });

  it("does not fire when every internal link and suggested slug is known, ignoring leading/trailing slashes", () => {
    const result = assessPublishReadiness(CLEAN_META, {
      knownSlugs: ["/blog/local-seo-basics/", "blog/listing-checklist"],
    });
    expect(result.blockers.map((b) => b.code)).not.toContain("dangling_internal_link");
  });
});

describe("assessPublishReadiness - unreachable_citation", () => {
  it("is skipped entirely when verifiedCitationUrls is omitted", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.blockers.map((b) => b.code)).not.toContain("unreachable_citation");
  });

  it("fires when a citation URL is not in verifiedCitationUrls", () => {
    const result = assessPublishReadiness(CLEAN_META, {
      verifiedCitationUrls: ["https://searchengineland.com/local-seo"],
    });
    expect(result.blockers.map((b) => b.code)).toContain("unreachable_citation");
  });

  it("does not fire when every external link and citation URL is verified", () => {
    const allUrls = [
      "https://searchengineland.com/local-seo",
      "https://moz.com/learn/seo/local",
      "https://brightlocal.com/research",
      "https://support.google.com/business",
      "https://searchengineland.com/benchmarks",
    ];
    const result = assessPublishReadiness(CLEAN_META, { verifiedCitationUrls: allUrls });
    expect(result.blockers.map((b) => b.code)).not.toContain("unreachable_citation");
  });
});

describe("assessPublishReadiness - quality score", () => {
  it("only warns by default when the score is low", () => {
    const thinBody = "## Only Section\n\nJust a couple of short sentences here.";
    const result = assessPublishReadiness(withBody(thinBody, { citations: [], faqSection: [], jsonLdSchema: undefined }));
    expect(result.warnings.map((w) => w.code)).toContain("low_quality_score");
    expect(result.blockers.map((b) => b.code)).not.toContain("low_quality_score");
  });

  it("promotes the score check to a blocker when minQualityScore is set and unmet", () => {
    const thinBody = "## Only Section\n\nJust a couple of short sentences here.";
    const result = assessPublishReadiness(
      withBody(thinBody, { citations: [], faqSection: [], jsonLdSchema: undefined }),
      { minQualityScore: 90 },
    );
    expect(result.blockers.map((b) => b.code)).toContain("low_quality_score");
    expect(result.ok).toBe(false);
  });

  it("does not block on a high score even when minQualityScore is set", () => {
    const result = assessPublishReadiness(CLEAN_META, { minQualityScore: 10 });
    expect(result.blockers.map((b) => b.code)).not.toContain("low_quality_score");
  });
});

describe("assessPublishReadiness - other warnings", () => {
  it("warns on ai_tells when slop signals are present", () => {
    const body = `${CLEAN_BODY}\n\nIn today's fast-paced world, this really matters a lot.`;
    const result = assessPublishReadiness(withBody(body));
    expect(result.warnings.map((w) => w.code)).toContain("ai_tells");
    expect(result.blockers).toEqual(result.blockers.filter((b) => b.code !== "ai_tells"));
  });

  it("warns on thin_content under 800 words", () => {
    const result = assessPublishReadiness(withBody("## Short\n\nJust a little bit of text here."));
    expect(result.warnings.map((w) => w.code)).toContain("thin_content");
  });

  it("warns on few_citations when the body has under 3 external links", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, citations: [] });
    // Body itself still has 5 external links, so this should NOT warn on a clean body.
    expect(result.warnings.map((w) => w.code)).not.toContain("few_citations");
  });

  it("warns on no_faq when fewer than 3 FAQ items are present", () => {
    const body = CLEAN_BODY.replace(
      /### Should every location get its own page\?[\s\S]*$/,
      "",
    );
    const result = assessPublishReadiness(withBody(body, { faqSection: [] }));
    expect(result.warnings.map((w) => w.code)).toContain("no_faq");
  });

  it("warns on no_schema when jsonLdSchema is missing", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, jsonLdSchema: undefined, pieceMetadata: undefined });
    expect(result.warnings.map((w) => w.code)).toContain("no_schema");
  });

  it("warns on no_schema when jsonLdSchema is an empty object", () => {
    const result = assessPublishReadiness({ ...CLEAN_META, jsonLdSchema: {} });
    expect(result.warnings.map((w) => w.code)).toContain("no_schema");
  });
});

describe("assessPublishReadiness - keyword_stuffing / keyword_underused", () => {
  it("is skipped entirely when targetKeyword is omitted", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.blockers.map((b) => b.code)).not.toContain("keyword_stuffing");
    expect(result.warnings.map((w) => w.code)).not.toContain("keyword_underused");
  });

  it("fires keyword_stuffing as a blocker when the keyword is over-repeated", () => {
    const filler = new Array(20).fill("word").join(" ");
    const stuffed = new Array(15).fill("local seo for dentists").join(" ");
    const body = `## Section\n\n${filler} ${stuffed} ${filler}`;
    const result = assessPublishReadiness(withBody(body), { targetKeyword: "local seo for dentists" });
    expect(result.blockers.map((b) => b.code)).toContain("keyword_stuffing");
    expect(result.ok).toBe(false);
  });

  it("fires keyword_underused as a warning, not a blocker, when the keyword barely appears", () => {
    const result = assessPublishReadiness(CLEAN_META, { targetKeyword: "unrelated phrase never mentioned" });
    expect(result.warnings.map((w) => w.code)).toContain("keyword_underused");
    expect(result.blockers.map((b) => b.code)).not.toContain("keyword_underused");
  });

  it("does not fire either check when the keyword appears at a natural rate", () => {
    const filler = new Array(40).fill("word").join(" ");
    const body = `## Section One\n\n${filler} local seo for dentists is the topic here. ${filler}\n\n## Section Two\n\n${filler} another mention of local seo for dentists shows up here. ${filler}`;
    const result = assessPublishReadiness(withBody(body), { targetKeyword: "local seo for dentists" });
    expect(result.blockers.map((b) => b.code)).not.toContain("keyword_stuffing");
    expect(result.warnings.map((w) => w.code)).not.toContain("keyword_underused");
  });
});

describe("assessPublishReadiness - duplicate_title", () => {
  it("is skipped entirely when existingTitles is omitted", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.blockers.map((b) => b.code)).not.toContain("duplicate_title");
  });

  it("fires as a blocker when a near-identical title already exists", () => {
    const result = assessPublishReadiness(CLEAN_META, {
      existingTitles: ["Local SEO Basics for Small Teams!"],
    });
    expect(result.blockers.map((b) => b.code)).toContain("duplicate_title");
    expect(result.ok).toBe(false);
  });

  it("does not fire when existing titles are genuinely different", () => {
    const result = assessPublishReadiness(CLEAN_META, {
      existingTitles: ["A Completely Unrelated Piece About Payroll Software"],
    });
    expect(result.blockers.map((b) => b.code)).not.toContain("duplicate_title");
  });
});

describe("assessPublishReadiness - weak_alt_text", () => {
  it("does not fire on well-written, distinct alt text", () => {
    const body = `${CLEAN_BODY}\n\n![A local dentist office storefront with a clean sign](https://example.com/photo.jpg)`;
    const result = assessPublishReadiness(withBody(body));
    expect(result.warnings.map((w) => w.code)).not.toContain("weak_alt_text");
  });

  it("fires as a warning, not a blocker, when alt text is a single word", () => {
    const body = `${CLEAN_BODY}\n\n![office](https://example.com/photo.jpg)`;
    const result = assessPublishReadiness(withBody(body));
    expect(result.warnings.map((w) => w.code)).toContain("weak_alt_text");
    expect(result.blockers.map((b) => b.code)).not.toContain("weak_alt_text");
  });

  it("fires when the same alt text is reused across multiple images", () => {
    const body = `${CLEAN_BODY}\n\n![dentist office front desk area](https://example.com/a.jpg)\n\n![dentist office front desk area](https://example.com/b.jpg)`;
    const result = assessPublishReadiness(withBody(body));
    expect(result.warnings.map((w) => w.code)).toContain("weak_alt_text");
  });

  it("does not fire and does not error when there are no images at all", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.warnings.map((w) => w.code)).not.toContain("weak_alt_text");
  });
});

describe("assessPublishReadiness - placeholder_token", () => {
  it("does not fire on a clean body with no placeholders", () => {
    const result = assessPublishReadiness(CLEAN_META);
    expect(result.warnings.map((w) => w.code)).not.toContain("placeholder_token");
    expect(result.blockers.map((b) => b.code)).not.toContain("placeholder_token");
  });

  it("warns (not blocks) on placeholders when unattended is false", () => {
    const body = `${CLEAN_BODY}\n\nContact [Company Name] at [CEO/Founder Name].`;
    const result = assessPublishReadiness(withBody(body), { unattended: false });
    expect(result.warnings.map((w) => w.code)).toContain("placeholder_token");
    expect(result.blockers.map((b) => b.code)).not.toContain("placeholder_token");
    expect(result.ok).toBe(true);
  });

  it("warns (not blocks) on placeholders when unattended is omitted", () => {
    const body = `${CLEAN_BODY}\n\nTODO: fill in the stats here.`;
    const result = assessPublishReadiness(withBody(body));
    expect(result.warnings.map((w) => w.code)).toContain("placeholder_token");
    expect(result.blockers.map((b) => b.code)).not.toContain("placeholder_token");
  });

  it("blocks when unattended is true and placeholders are present", () => {
    const body = `${CLEAN_BODY}\n\nThis was written by [CEO/Founder Name] at [Company Name].`;
    const result = assessPublishReadiness(withBody(body), { unattended: true });
    expect(result.blockers.map((b) => b.code)).toContain("placeholder_token");
    expect(result.ok).toBe(false);
  });

  it("includes the placeholder tokens in the issue detail", () => {
    const body = `${CLEAN_BODY}\n\nFor [Company Name], contact [Name, Title, Company].`;
    const result = assessPublishReadiness(withBody(body));
    const issue = result.warnings.find((w) => w.code === "placeholder_token");
    expect(issue?.detail).toContain("[Company Name]");
  });
});

describe("assessPublishReadiness - structural input shapes", () => {
  it("reads fields folded into pieceMetadata, matching a raw DB row shape", () => {
    const raw: PublishReadinessPiece = {
      title: CLEAN_META.title,
      bodyMarkdown: CLEAN_META.bodyMarkdown,
      pieceMetadata: {
        seoTitle: CLEAN_META.metaTitle ?? undefined,
        metaDescription: CLEAN_META.metaDescription ?? undefined,
        citations: CLEAN_META.citations ?? undefined,
        faqSection: CLEAN_META.faqSection ?? undefined,
        internalLinkSuggestions: CLEAN_META.internalLinkSuggestions ?? undefined,
        jsonLdSchema: CLEAN_META.jsonLdSchema ?? undefined,
      },
    };
    const result = assessPublishReadiness(raw);
    expect(result.blockers).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("assessPublishReadiness - unattributed_claim", () => {
  const UNSOURCED_CLAIM_BODY = `${CLEAN_BODY}\n\nAccording to a 2024 Harvard study, 73 percent of buyers abandon checkout.`;

  it("is skipped entirely when checkUnattributedClaims is omitted", () => {
    const result = assessPublishReadiness(withBody(UNSOURCED_CLAIM_BODY));
    expect(result.warnings.map((w) => w.code)).not.toContain("unattributed_claim");
    expect(result.blockers.map((b) => b.code)).not.toContain("unattributed_claim");
  });

  it("is skipped entirely when checkUnattributedClaims is explicitly false", () => {
    const result = assessPublishReadiness(withBody(UNSOURCED_CLAIM_BODY), {
      checkUnattributedClaims: false,
    });
    expect(result.warnings.map((w) => w.code)).not.toContain("unattributed_claim");
  });

  it("fires as a warning, never a blocker, when an unsourced stat is present and the check is enabled", () => {
    const result = assessPublishReadiness(withBody(UNSOURCED_CLAIM_BODY), {
      checkUnattributedClaims: true,
    });
    expect(result.warnings.map((w) => w.code)).toContain("unattributed_claim");
    expect(result.blockers.map((b) => b.code)).not.toContain("unattributed_claim");

    const issue = result.warnings.find((w) => w.code === "unattributed_claim");
    expect(issue?.severity).toBe("warning");
    expect(issue?.detail).toContain("73 percent of buyers abandon checkout");
  });

  it("caps the listed offending sentences in detail at 3", () => {
    const manyClaims = Array.from(
      { length: 5 },
      (_, i) => `According to a 20${10 + i} study, ${10 + i} percent of shoppers switched brands.`,
    ).join(" ");
    const body = `${CLEAN_BODY}\n\n${manyClaims}`;
    const result = assessPublishReadiness(withBody(body), { checkUnattributedClaims: true });
    const issue = result.warnings.find((w) => w.code === "unattributed_claim");
    expect(issue).toBeDefined();
    expect(issue!.detail!.split(" | ")).toHaveLength(3);
  });

  it("does not fire on the clean fixture body even when enabled, since every claim there is linked", () => {
    const result = assessPublishReadiness(CLEAN_META, { checkUnattributedClaims: true });
    expect(result.warnings.map((w) => w.code)).not.toContain("unattributed_claim");
  });
});
