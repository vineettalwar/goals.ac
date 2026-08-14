import { describe, expect, it } from "vitest";
import { anchorCandidates, planInternalLinks, type LinkSourcePost } from "./internal-link-planner";

const POSTS: LinkSourcePost[] = [
  {
    id: 1,
    url: "https://example.com/pricing",
    title: "How We Price Retainers",
    body: "Our wordpress maintenance plans start at a flat monthly rate.",
  },
  {
    id: 2,
    url: "https://example.com/security",
    title: "Security Basics",
    body: "Good wordpress maintenance covers backups and updates.",
  },
  {
    id: 3,
    url: "https://example.com/hiring",
    title: "Hiring a CFO",
    body: "Finance leadership for early stage startups.",
  },
];

describe("anchorCandidates", () => {
  it("offers the full phrase first", () => {
    expect(anchorCandidates("wordpress maintenance plans")[0]).toBe("wordpress maintenance plans");
  });

  it("falls back to shorter leading phrases", () => {
    expect(anchorCandidates("wordpress maintenance plans")).toContain("wordpress maintenance");
  });

  it("never offers a single-word anchor", () => {
    for (const candidate of anchorCandidates("wordpress maintenance plans")) {
      expect(candidate.split(" ").length).toBeGreaterThan(1);
    }
  });

  it("returns nothing usable for a one-word keyword", () => {
    expect(anchorCandidates("seo")).toEqual(["seo"]);
  });

  it("normalizes whitespace and case", () => {
    expect(anchorCandidates("  WordPress   Maintenance  ")[0]).toBe("wordpress maintenance");
  });
});

describe("planInternalLinks", () => {
  const base = {
    targetUrl: "https://example.com/wordpress-maintenance-plans",
    targetKeyword: "wordpress maintenance plans",
    posts: POSTS,
  };

  it("selects posts that already mention the phrase", () => {
    const plan = planInternalLinks(base);

    expect(plan).not.toBeNull();
    expect(plan!.postIds).toContain(1);
    expect(plan!.postIds).not.toContain(3);
  });

  it("falls back to a shorter anchor when the full phrase is absent", () => {
    const plan = planInternalLinks({ ...base, posts: [POSTS[1]!] });

    expect(plan!.anchorText).toBe("wordpress maintenance");
    expect(plan!.postIds).toEqual([2]);
  });

  it("prefers the full phrase when a post contains it", () => {
    const plan = planInternalLinks({ ...base, posts: [POSTS[0]!, POSTS[1]!] });

    expect(plan!.anchorText).toBe("wordpress maintenance plans");
    expect(plan!.postIds).toEqual([1]);
  });

  it("never links a post to itself", () => {
    const plan = planInternalLinks({
      ...base,
      targetUrl: "https://example.com/pricing",
      posts: [POSTS[0]!],
    });

    expect(plan?.postIds ?? []).not.toContain(1);
  });

  it("ignores a trailing-slash difference when excluding the target", () => {
    const plan = planInternalLinks({
      ...base,
      targetKeyword: "how we price",
      targetUrl: "https://example.com/pricing",
      posts: [{ id: 1, url: "https://example.com/pricing ", title: "How We Price Retainers" }],
    });

    expect(plan).toBeNull();
  });

  it("returns null when nothing mentions the topic", () => {
    expect(planInternalLinks({ ...base, targetKeyword: "shopify themes" })).toBeNull();
  });

  it("returns null for an empty site", () => {
    expect(planInternalLinks({ ...base, posts: [] })).toBeNull();
  });

  it("respects the limit", () => {
    const plan = planInternalLinks({ ...base, targetKeyword: "wordpress maintenance", limit: 1 });

    expect(plan!.postIds).toHaveLength(1);
  });

  it("returns null for a non-positive limit", () => {
    expect(planInternalLinks({ ...base, limit: 0 })).toBeNull();
  });

  it("skips posts with no id or url", () => {
    const plan = planInternalLinks({
      ...base,
      posts: [
        { id: 0, url: "https://example.com/a", body: "wordpress maintenance plans" },
        { id: 4, url: "", body: "wordpress maintenance plans" },
      ],
    });

    expect(plan).toBeNull();
  });

  it("matches a phrase split across a line break", () => {
    const plan = planInternalLinks({
      ...base,
      posts: [{ id: 9, url: "https://example.com/x", body: "our wordpress\nmaintenance plans work" }],
    });

    expect(plan!.postIds).toEqual([9]);
  });

  it("matches case-insensitively", () => {
    const plan = planInternalLinks({
      ...base,
      posts: [{ id: 7, url: "https://example.com/y", title: "WordPress Maintenance Plans Explained" }],
    });

    expect(plan!.postIds).toEqual([7]);
  });
});
