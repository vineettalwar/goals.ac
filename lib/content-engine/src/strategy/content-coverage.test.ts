import { describe, expect, it } from "vitest";
import {
  buildWordWeights,
  checkCoverage,
  contentWords,
  coverageReason,
  coverageScore,
  internalLinkTargets,
  type CoveredPost,
} from "./content-coverage";

const SITE: CoveredPost[] = [
  {
    url: "https://example.com/wordpress-maintenance-plans",
    title: "WordPress Maintenance Plans",
    excerpt: "What a maintenance plan covers and how to price one.",
  },
  {
    url: "https://example.com/wordpress-security",
    title: "WordPress Security Checklist",
    excerpt: "Harden a WordPress install against common attacks.",
  },
  {
    url: "https://example.com/hiring-a-cfo",
    title: "Hiring a Fractional CFO",
    excerpt: "When a startup needs finance leadership.",
  },
];

describe("contentWords", () => {
  it("drops stopwords, punctuation, and single characters", () => {
    expect(contentWords("The best guide to WordPress, in 2026!")).toEqual(["wordpress", "2026"]);
  });

  it("returns nothing for a query made only of stopwords", () => {
    expect(contentWords("what is the best")).toEqual([]);
  });

  it("keeps non-ASCII words", () => {
    expect(contentWords("Preise für Wartung")).toEqual(["preise", "für", "wartung"]);
  });
});

describe("coverageScore", () => {
  it("scores a title that covers every query word at 1", () => {
    expect(coverageScore("wordpress maintenance plans", SITE[0]!)).toBe(1);
  });

  it("half-counts a word found only in the excerpt", () => {
    const post: CoveredPost = { url: "/x", title: "Pricing", excerpt: "about retainers" };

    expect(coverageScore("pricing retainers", post)).toBe(0.75);
  });

  it("scores an unrelated post at 0", () => {
    expect(coverageScore("wordpress maintenance plans", SITE[2]!)).toBe(0);
  });

  it("returns 0 for a query with no content words rather than dividing by zero", () => {
    expect(coverageScore("what is the best", SITE[0]!)).toBe(0);
  });

  it("stays asymmetric — a long post fully covers a short query", () => {
    const post: CoveredPost = {
      url: "/x",
      title: "WordPress Maintenance Plans, Pricing, Security, and Backups",
    };

    expect(coverageScore("wordpress maintenance", post)).toBe(1);
  });
});

describe("buildWordWeights", () => {
  it("discounts a word that appears in most titles", () => {
    const weights = buildWordWeights(SITE);

    expect(weights.get("wordpress")!).toBeLessThan(weights.get("maintenance")!);
  });

  it("floors the weight of a word common to every title", () => {
    const weights = buildWordWeights([
      { url: "/a", title: "WordPress Security" },
      { url: "/b", title: "WordPress Backups" },
    ]);

    expect(weights.get("wordpress")).toBeCloseTo(0.3);
  });

  it("returns no weights for an empty site", () => {
    expect(buildWordWeights([]).size).toBe(0);
  });

  it("keeps a single-topic blog usable rather than scoring everything at zero", () => {
    const singleTopic = [
      { url: "/a", title: "WordPress Speed" },
      { url: "/b", title: "WordPress Security" },
    ];

    expect(checkCoverage("wordpress speed", singleTopic).verdict).toBe("covered");
  });
});

describe("checkCoverage", () => {
  it("flags an exact topic duplicate as covered", () => {
    const result = checkCoverage("wordpress maintenance plans", SITE);

    expect(result.verdict).toBe("covered");
    expect(result.match?.url).toBe("https://example.com/wordpress-maintenance-plans");
  });

  it("passes a genuinely new topic as clear", () => {
    const result = checkCoverage("shopify theme performance", SITE);

    expect(result.verdict).toBe("clear");
    expect(result.match).toBeNull();
  });

  it("flags a same-topic, different-modifier query as overlap, not covered", () => {
    const result = checkCoverage("wordpress maintenance pricing", SITE);

    expect(result.verdict).toBe("overlap");
    expect(result.match?.url).toBe("https://example.com/wordpress-maintenance-plans");
  });

  it("does not flag a collision on a shared brand word alone", () => {
    const result = checkCoverage("wordpress backups", SITE);

    expect(result.verdict).toBe("clear");
    expect(result.related.length).toBeGreaterThan(0);
  });

  it("excludes the matched post from its own related list", () => {
    const result = checkCoverage("wordpress maintenance plans", SITE);

    expect(result.related.map((r) => r.url)).not.toContain(result.match?.url);
  });

  it("handles an empty site — a first post is never cannibalization", () => {
    expect(checkCoverage("anything at all", [])).toEqual({
      verdict: "clear",
      match: null,
      related: [],
    });
  });

  it("skips posts with no url", () => {
    const result = checkCoverage("wordpress maintenance plans", [
      { url: "", title: "WordPress Maintenance Plans" },
    ]);

    expect(result.verdict).toBe("clear");
  });

  it("falls back to the url when a post has no title", () => {
    const result = checkCoverage("wordpress maintenance", [
      { url: "https://example.com/p", excerpt: "wordpress maintenance explained" },
    ]);

    expect(result.match?.title).toBe("https://example.com/p");
  });

  it("orders ties deterministically", () => {
    const twins: CoveredPost[] = [
      { url: "https://example.com/b", title: "WordPress Maintenance" },
      { url: "https://example.com/a", title: "WordPress Maintenance" },
    ];

    expect(checkCoverage("wordpress maintenance", twins).match?.url).toBe("https://example.com/a");
  });

  it("respects the related limit", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      url: `https://example.com/${i}`,
      title: "WordPress Maintenance Plans",
    }));

    expect(checkCoverage("wordpress maintenance plans", many, { relatedLimit: 2 }).related).toHaveLength(2);
  });
});

describe("internalLinkTargets", () => {
  it("returns the strongest related posts first", () => {
    const targets = internalLinkTargets("wordpress maintenance plans", SITE);

    expect(targets[0]?.url).toBe("https://example.com/wordpress-maintenance-plans");
    expect(targets.map((t) => t.url)).not.toContain("https://example.com/hiring-a-cfo");
  });

  it("honors the limit", () => {
    expect(internalLinkTargets("wordpress maintenance security", SITE, 1)).toHaveLength(1);
  });

  it("returns nothing when the site has no related content", () => {
    expect(internalLinkTargets("shopify theme performance", SITE)).toEqual([]);
  });
});

describe("coverageReason", () => {
  it("recommends a refresh when the topic is covered", () => {
    const reason = coverageReason(checkCoverage("wordpress maintenance plans", SITE));

    expect(reason).toContain("refresh");
    expect(reason).toContain("WordPress Maintenance Plans");
  });

  it("recommends narrowing the angle on an overlap", () => {
    const reason = coverageReason(checkCoverage("wordpress maintenance pricing", SITE));

    expect(reason).toContain("narrow the angle");
  });

  it("says nothing when the brief is clear", () => {
    expect(coverageReason(checkCoverage("shopify theme performance", SITE))).toBeNull();
  });
});
