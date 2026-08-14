import { describe, expect, it } from "vitest";
import {
  decayReason,
  detectContentDecay,
  rollupGscPages,
  type GscRow,
} from "./contentDecayDetector";

function row(over: Partial<GscRow> & { page: string }): GscRow {
  return {
    query: "wordpress maintenance",
    impressions: 1000,
    clicks: 50,
    ctr: 0.05,
    position: 5,
    ...over,
  };
}

describe("rollupGscPages", () => {
  it("aggregates impressions and clicks per page", () => {
    const [page] = rollupGscPages([
      row({ page: "/a", query: "one", impressions: 600, clicks: 30 }),
      row({ page: "/a", query: "two", impressions: 400, clicks: 20 }),
    ]);

    expect(page!.impressions).toBe(1000);
    expect(page!.clicks).toBe(50);
    expect(page!.ctr).toBeCloseTo(0.05);
  });

  it("weights position by impressions", () => {
    const [page] = rollupGscPages([
      row({ page: "/a", query: "one", impressions: 900, position: 3 }),
      row({ page: "/a", query: "two", impressions: 100, position: 30 }),
    ]);

    expect(page!.position).toBeCloseTo(5.7);
  });

  it("names the highest-impression query as the refresh target", () => {
    const [page] = rollupGscPages([
      row({ page: "/a", query: "minor", impressions: 100 }),
      row({ page: "/a", query: "major", impressions: 900 }),
    ]);

    expect(page!.topQuery).toBe("major");
  });

  it("resolves top-query ties deterministically", () => {
    const first = rollupGscPages([
      row({ page: "/a", query: "beta", impressions: 500 }),
      row({ page: "/a", query: "alpha", impressions: 500 }),
    ]);
    const second = rollupGscPages([
      row({ page: "/a", query: "alpha", impressions: 500 }),
      row({ page: "/a", query: "beta", impressions: 500 }),
    ]);

    expect(first[0]!.topQuery).toBe(second[0]!.topQuery);
  });

  it("skips rows with no page", () => {
    expect(rollupGscPages([row({ page: "" }), { ...row({ page: "/a" }), page: null }])).toEqual([]);
  });

  it("returns nothing for no rows", () => {
    expect(rollupGscPages([])).toEqual([]);
  });
});

describe("detectContentDecay", () => {
  it("flags a page that slipped in position", () => {
    const previous = [row({ page: "/a", position: 4 })];
    const current = [row({ page: "/a", position: 9 })];

    const [decayed] = detectContentDecay(current, previous);

    expect(decayed!.pattern).toBe("position_slide");
    expect(decayed!.previousPosition).toBe(4);
    expect(decayed!.decayScore).toBeGreaterThan(40);
  });

  it("ignores a slide too small to act on", () => {
    const previous = [row({ page: "/a", position: 4 })];
    const current = [row({ page: "/a", position: 5 })];

    expect(detectContentDecay(current, previous)).toEqual([]);
  });

  it("flags click loss when impressions held", () => {
    const previous = [row({ page: "/a", impressions: 1000, clicks: 100 })];
    const current = [row({ page: "/a", impressions: 1000, clicks: 40 })];

    const [decayed] = detectContentDecay(current, previous);

    expect(decayed!.pattern).toBe("click_loss");
    expect(decayed!.previousClicks).toBe(100);
  });

  it("does not call it click loss when demand itself fell", () => {
    const previous = [row({ page: "/a", impressions: 1000, clicks: 100 })];
    const current = [row({ page: "/a", impressions: 300, clicks: 30 })];

    expect(detectContentDecay(current, previous)).toEqual([]);
  });

  it("flags a page stuck on page two with no history", () => {
    const [decayed] = detectContentDecay([row({ page: "/a", position: 14, impressions: 500 })]);

    expect(decayed!.pattern).toBe("stuck_page_two");
    expect(decayed!.previousPosition).toBeNull();
  });

  it("leaves a healthy page alone", () => {
    const previous = [row({ page: "/a", position: 3, clicks: 100 })];
    const current = [row({ page: "/a", position: 3, clicks: 105 })];

    expect(detectContentDecay(current, previous)).toEqual([]);
  });

  it("does not flag a page ranking well but never on page two", () => {
    expect(detectContentDecay([row({ page: "/a", position: 3, impressions: 5000 })])).toEqual([]);
  });

  it("skips pages with too little search data to judge", () => {
    const previous = [row({ page: "/a", impressions: 20, position: 4 })];
    const current = [row({ page: "/a", impressions: 20, position: 12 })];

    expect(detectContentDecay(current, previous)).toEqual([]);
  });

  it("skips pages ranked far too low for a refresh to help", () => {
    const previous = [row({ page: "/a", position: 40 })];
    const current = [row({ page: "/a", position: 60 })];

    expect(detectContentDecay(current, previous)).toEqual([]);
  });

  it("prefers the stronger signal when a page both slid and lost clicks", () => {
    const previous = [row({ page: "/a", position: 4, impressions: 1000, clicks: 100 })];
    const current = [row({ page: "/a", position: 5.6, impressions: 1000, clicks: 10 })];

    const [decayed] = detectContentDecay(current, previous);

    expect(decayed!.pattern).toBe("click_loss");
  });

  it("orders results by score, then page, deterministically", () => {
    const previous = [
      row({ page: "/small", position: 4 }),
      row({ page: "/big", position: 4 }),
    ];
    const current = [
      row({ page: "/small", position: 6 }),
      row({ page: "/big", position: 14 }),
    ];

    expect(detectContentDecay(current, previous).map((d) => d.page)).toEqual(["/big", "/small"]);
  });

  it("honors a custom impression floor", () => {
    const previous = [row({ page: "/a", impressions: 30, position: 4 })];
    const current = [row({ page: "/a", impressions: 30, position: 10 })];

    expect(detectContentDecay(current, previous, { minImpressions: 10 })).toHaveLength(1);
  });

  it("caps the score at 100", () => {
    const previous = [row({ page: "/a", position: 1 })];
    const current = [row({ page: "/a", position: 29 })];

    expect(detectContentDecay(current, previous)[0]!.decayScore).toBeLessThanOrEqual(100);
  });

  it("returns nothing for empty input", () => {
    expect(detectContentDecay([], [])).toEqual([]);
  });
});

describe("decayReason", () => {
  it("tells the user to refresh rather than publish a competing page", () => {
    const [decayed] = detectContentDecay(
      [row({ page: "/a", position: 9 })],
      [row({ page: "/a", position: 4 })],
    );

    expect(decayReason(decayed!)).toContain("Refresh the existing page");
  });

  it("points click loss at the title and meta description", () => {
    const [decayed] = detectContentDecay(
      [row({ page: "/a", impressions: 1000, clicks: 40 })],
      [row({ page: "/a", impressions: 1000, clicks: 100 })],
    );

    expect(decayReason(decayed!)).toContain("meta description");
  });

  it("explains the page-two case", () => {
    const [decayed] = detectContentDecay([row({ page: "/a", position: 14, impressions: 500 })]);

    expect(decayReason(decayed!)).toContain("page-two");
  });
});
