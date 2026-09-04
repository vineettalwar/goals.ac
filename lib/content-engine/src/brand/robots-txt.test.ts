import { describe, expect, it, vi } from "vitest";
import { createRobotsGate, isPathAllowed, parseRobotsTxt } from "./robots-txt";

describe("parseRobotsTxt", () => {
  it("returns allow-all when Disallow is empty", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow:\n", "GoalsAC");
    expect(rules.disallow).toEqual([]);
  });

  it("strips comments", () => {
    const rules = parseRobotsTxt("User-agent: * # everyone\nDisallow: /admin # keep out\n", "GoalsAC");
    expect(rules.disallow).toEqual(["/admin"]);
  });

  it("picks the most specific matching agent over the wildcard group", () => {
    const text = [
      "User-agent: *",
      "Disallow: /private",
      "",
      "User-agent: GoalsAC",
      "Disallow: /special",
    ].join("\n");
    const rules = parseRobotsTxt(text, "GoalsAC");
    expect(rules.disallow).toEqual(["/special"]);
  });

  it("falls back to the wildcard group when no specific agent matches", () => {
    const text = ["User-agent: OtherBot", "Disallow: /x", "", "User-agent: *", "Disallow: /y"].join(
      "\n",
    );
    const rules = parseRobotsTxt(text, "GoalsAC");
    expect(rules.disallow).toEqual(["/y"]);
  });

  it("parses crawl-delay", () => {
    const rules = parseRobotsTxt("User-agent: *\nCrawl-delay: 5\n", "GoalsAC");
    expect(rules.crawlDelaySeconds).toBe(5);
  });

  it("returns empty rules for unparseable text", () => {
    const rules = parseRobotsTxt("this is not robots.txt syntax at all\njust prose", "GoalsAC");
    expect(rules.disallow).toEqual([]);
    expect(rules.allow).toEqual([]);
  });

  it("merges every group that matches the wildcard agent, not just the first", () => {
    const text = [
      "User-agent: *",
      "Disallow: /admin",
      "",
      "User-agent: Googlebot",
      "Disallow: /nogoogle",
      "",
      "User-agent: *",
      "Disallow: /private",
    ].join("\n");
    const rules = parseRobotsTxt(text, "GoalsAC");
    expect(rules.disallow).toEqual(["/admin", "/private"]);
  });

  it("merges every group that matches a specific agent, not just the first", () => {
    const text = [
      "User-agent: GoalsAC",
      "Disallow: /first",
      "",
      "User-agent: OtherBot",
      "Disallow: /ignored",
      "",
      "User-agent: GoalsAC",
      "Disallow: /second",
    ].join("\n");
    const rules = parseRobotsTxt(text, "GoalsAC");
    expect(rules.disallow).toEqual(["/first", "/second"]);
  });

  it("matches the agent by case-insensitive prefix, not two-way substring", () => {
    // "a" is a prefix of "goalsac" under a correct prefix match, but a
    // naive substring test would also match "go", "sac", "goal", etc. Use
    // a token that is NOT a prefix of "goalsac" to prove substring matches
    // are rejected.
    const text = ["User-agent: sac", "Disallow: /", "", "User-agent: *", "Allow: /"].join("\n");
    const rules = parseRobotsTxt(text, "GoalsAC");
    // "sac" is not a prefix of "goalsac", so the wildcard group applies.
    expect(rules.disallow).toEqual([]);
    expect(rules.allow).toEqual(["/"]);
  });

  it("matches the agent by prefix even when the token is short", () => {
    const text = ["User-agent: goals", "Disallow: /blocked"].join("\n");
    const rules = parseRobotsTxt(text, "GoalsAC");
    expect(rules.disallow).toEqual(["/blocked"]);
  });
});

describe("isPathAllowed", () => {
  it("allows everything when there are no rules", () => {
    expect(isPathAllowed({ disallow: [], allow: [] }, "https://example.com/anything")).toBe(true);
  });

  it("disallows an exact path match", () => {
    const rules = { disallow: ["/admin"], allow: [] };
    expect(isPathAllowed(rules, "https://example.com/admin")).toBe(false);
    expect(isPathAllowed(rules, "https://example.com/admin/users")).toBe(false);
    expect(isPathAllowed(rules, "https://example.com/other")).toBe(true);
  });

  it("blocks everything with a bare Disallow: /", () => {
    const rules = { disallow: ["/"], allow: [] };
    expect(isPathAllowed(rules, "https://example.com/")).toBe(false);
    expect(isPathAllowed(rules, "https://example.com/anything")).toBe(false);
  });

  it("supports * wildcards mid-pattern", () => {
    const rules = { disallow: ["/*/private"], allow: [] };
    expect(isPathAllowed(rules, "https://example.com/team/private")).toBe(false);
    expect(isPathAllowed(rules, "https://example.com/team/public")).toBe(true);
  });

  it("supports $ end-anchoring", () => {
    const rules = { disallow: ["/file$"], allow: [] };
    expect(isPathAllowed(rules, "https://example.com/file")).toBe(false);
    expect(isPathAllowed(rules, "https://example.com/file.html")).toBe(true);
  });

  it("lets a longer, more specific Allow override a shorter Disallow", () => {
    const rules = { disallow: ["/blog"], allow: ["/blog/public"] };
    expect(isPathAllowed(rules, "https://example.com/blog/public/post")).toBe(true);
    expect(isPathAllowed(rules, "https://example.com/blog/private")).toBe(false);
  });

  it("lets a longer, more specific Disallow override a shorter Allow", () => {
    const rules = { disallow: ["/blog/secret"], allow: ["/blog"] };
    expect(isPathAllowed(rules, "https://example.com/blog/secret/post")).toBe(false);
    expect(isPathAllowed(rules, "https://example.com/blog/post")).toBe(true);
  });

  it("treats an unparseable URL as allowed", () => {
    expect(isPathAllowed({ disallow: ["/x"], allow: [] }, "not a url")).toBe(true);
  });
});

describe("createRobotsGate", () => {
  it("allows everything when robots.txt is missing (fetch returns null)", async () => {
    const fetchText = vi.fn().mockResolvedValue(null);
    const gate = createRobotsGate("GoalsAC", fetchText);
    await expect(gate.isAllowed("https://example.com/anything")).resolves.toBe(true);
  });

  it("allows everything when the fetch throws (500 or network error)", async () => {
    const fetchText = vi.fn().mockRejectedValue(new Error("boom"));
    const gate = createRobotsGate("GoalsAC", fetchText);
    await expect(gate.isAllowed("https://example.com/anything")).resolves.toBe(true);
  });

  it("retries after a thrown fetch instead of caching allow-all for the whole run", async () => {
    // A timeout or DNS blip is not an answer about what we may crawl. If it
    // were cached, one bad moment would disable robots for every later URL.
    const fetchText = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("User-agent: *\nDisallow: /private\n");
    const gate = createRobotsGate("GoalsAC", fetchText);

    await expect(gate.isAllowed("https://example.com/private")).resolves.toBe(true);
    await expect(gate.isAllowed("https://example.com/private")).resolves.toBe(false);
    expect(fetchText).toHaveBeenCalledTimes(2);
  });

  it("allows everything when robots.txt is unparseable garbage", async () => {
    const fetchText = vi.fn().mockResolvedValue("\x00\x01 binary garbage \xff");
    const gate = createRobotsGate("GoalsAC", fetchText);
    await expect(gate.isAllowed("https://example.com/anything")).resolves.toBe(true);
  });

  it("disallows a blocked path once robots.txt is fetched", async () => {
    const fetchText = vi.fn().mockResolvedValue("User-agent: *\nDisallow: /blocked\n");
    const gate = createRobotsGate("GoalsAC", fetchText);
    await expect(gate.isAllowed("https://example.com/blocked")).resolves.toBe(false);
    await expect(gate.isAllowed("https://example.com/ok")).resolves.toBe(true);
  });

  it("blocks a site that disallows everything", async () => {
    const fetchText = vi.fn().mockResolvedValue("User-agent: *\nDisallow: /\n");
    const gate = createRobotsGate("GoalsAC", fetchText);
    await expect(gate.isAllowed("https://example.com/anything")).resolves.toBe(false);
  });

  it("fetches robots.txt at most once per origin, even under concurrent calls", async () => {
    let resolveFetch!: (value: string | null) => void;
    const fetchText = vi.fn().mockImplementation(
      () =>
        new Promise<string | null>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const gate = createRobotsGate("GoalsAC", fetchText);

    const p1 = gate.isAllowed("https://example.com/a");
    const p2 = gate.isAllowed("https://example.com/b");
    expect(fetchText).toHaveBeenCalledTimes(1);

    resolveFetch("User-agent: *\nDisallow:\n");
    await Promise.all([p1, p2]);
    expect(fetchText).toHaveBeenCalledTimes(1);

    await gate.isAllowed("https://example.com/c");
    expect(fetchText).toHaveBeenCalledTimes(1);
  });

  it("tracks robots.txt per origin independently", async () => {
    const fetchText = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("https://a.com")) return Promise.resolve("User-agent: *\nDisallow: /\n");
      return Promise.resolve("User-agent: *\nDisallow:\n");
    });
    const gate = createRobotsGate("GoalsAC", fetchText);
    await expect(gate.isAllowed("https://a.com/page")).resolves.toBe(false);
    await expect(gate.isAllowed("https://b.com/page")).resolves.toBe(true);
    expect(fetchText).toHaveBeenCalledTimes(2);
  });
});
