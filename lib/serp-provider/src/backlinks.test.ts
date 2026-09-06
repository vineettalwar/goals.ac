import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchBacklinksOverview,
  isBacklinksConfigured,
} from "./backlinks";

const originalLogin = process.env["DATAFORSEO_LOGIN"];
const originalPassword = process.env["DATAFORSEO_PASSWORD"];

function setCreds(on: boolean) {
  if (on) {
    process.env["DATAFORSEO_LOGIN"] = "testlogin";
    process.env["DATAFORSEO_PASSWORD"] = "testpassword";
  } else {
    delete process.env["DATAFORSEO_LOGIN"];
    delete process.env["DATAFORSEO_PASSWORD"];
  }
}

function summaryResponse(overrides: Record<string, unknown> = {}) {
  return {
    tasks: [
      {
        status_code: 20000,
        result: [
          {
            rank: 55,
            backlinks: 1200,
            referring_domains: 80,
            referring_pages: 950,
            broken_backlinks: 5,
            backlinks_spam_score: 3,
            ...overrides,
          },
        ],
      },
    ],
  };
}

function domainsResponse(
  items: Array<Record<string, unknown>> = [],
) {
  return {
    tasks: [
      {
        status_code: 20000,
        result: [{ items }],
      },
    ],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalLogin === undefined) delete process.env["DATAFORSEO_LOGIN"];
  else process.env["DATAFORSEO_LOGIN"] = originalLogin;
  if (originalPassword === undefined) delete process.env["DATAFORSEO_PASSWORD"];
  else process.env["DATAFORSEO_PASSWORD"] = originalPassword;
});

describe("isBacklinksConfigured", () => {
  it("returns false when either credential is missing", () => {
    setCreds(false);
    expect(isBacklinksConfigured()).toBe(false);
    process.env["DATAFORSEO_LOGIN"] = "login";
    expect(isBacklinksConfigured()).toBe(false);
    process.env["DATAFORSEO_PASSWORD"] = "password";
    expect(isBacklinksConfigured()).toBe(true);
  });
});

describe("fetchBacklinksOverview", () => {
  beforeEach(() => setCreds(true));

  it("throws when credentials are not configured", async () => {
    setCreds(false);
    await expect(
      fetchBacklinksOverview({ target: "example.com" }),
    ).rejects.toThrow(/not configured/);
  });

  it("normalizes target — strips protocol, path, and www prefix", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => summaryResponse(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => domainsResponse(),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBacklinksOverview({
      target: "https://www.example.com/blog/post?foo=bar",
    });

    expect(result.target).toBe("example.com");
  });

  it("shapes summary and referring domains from DFS response", async () => {
    const items = [
      {
        domain: "linker.com",
        backlinks: 42,
        rank: 70,
        first_seen: "2024-01-15",
      },
      {
        domain: "other.org",
        backlinks: 10,
        rank: 30,
        first_seen: null,
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => summaryResponse(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => domainsResponse(items),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBacklinksOverview({ target: "example.com" });

    expect(result.configured).toBe(true);
    expect(result.target).toBe("example.com");
    expect(result.costEstimateUsd).toBe(0.02);
    expect(result.summary).toEqual({
      rank: 55,
      backlinks: 1200,
      referringDomains: 80,
      referringPages: 950,
      brokenBacklinks: 5,
      spamScore: 3,
    });
    expect(result.referringDomains).toEqual([
      { domain: "linker.com", backlinks: 42, rank: 70, firstSeen: "2024-01-15" },
      { domain: "other.org", backlinks: 10, rank: 30, firstSeen: null },
    ]);
    expect(typeof result.fetchedAt).toBe("string");
  });

  it("falls back to info.target_spam_score when backlinks_spam_score is absent", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => summaryResponse({
          backlinks_spam_score: undefined,
          info: { target_spam_score: 12 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => domainsResponse(),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBacklinksOverview({ target: "example.com" });
    expect(result.summary.spamScore).toBe(12);
  });

  it("throws on DFS task-level error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tasks: [{ status_code: 40400, status_message: "Not Found" }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchBacklinksOverview({ target: "example.com" }),
    ).rejects.toThrow("Not Found");
  });

  it("throws on HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 429 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchBacklinksOverview({ target: "example.com" }),
    ).rejects.toThrow("DataForSEO HTTP 429");
  });

  it("caps referringDomainsLimit at 25", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => summaryResponse(),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => domainsResponse(),
      });
    vi.stubGlobal("fetch", fetchMock);

    await fetchBacklinksOverview({ target: "example.com", referringDomainsLimit: 100 });

    const domainsBody = JSON.parse(
      (fetchMock.mock.calls[1]?.[1] as RequestInit).body as string,
    );
    expect(domainsBody[0].limit).toBe(25);
  });
});
