import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCitationVerifierCache, verifyCitations } from "./citation-verifier";

describe("citation-verifier", () => {
  beforeEach(() => {
    clearCitationVerifierCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks a 200 response as reachable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["https://example.com/article"]);

    expect(result.checks).toHaveLength(1);
    expect(result.checks[0]).toMatchObject({
      url: "https://example.com/article",
      verdict: "reachable",
      status: 200,
    });
    expect(result.verifiedUrls).toEqual(["https://example.com/article"]);
  });

  it("marks a 404 response as unreachable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["https://example.com/missing"]);

    expect(result.checks[0]).toMatchObject({ verdict: "unreachable", status: 404 });
    expect(result.verifiedUrls).toEqual([]);
  });

  it("falls back to GET when HEAD returns 405", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return Promise.resolve(new Response(null, { status: 405 }));
      }
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["https://example.com/no-head"]);

    expect(result.checks[0]).toMatchObject({ verdict: "reachable", status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks a timeout as unreachable", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["https://example.com/slow"], { timeoutMs: 10 });

    expect(result.checks[0]!.verdict).toBe("unreachable");
    expect(result.checks[0]!.reason).toMatch(/timed out/i);
  });

  it("skips a URL rejected by the SSRF guard without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["http://localhost/admin"]);

    expect(result.checks[0]!.verdict).toBe("skipped");
    expect(result.verifiedUrls).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves a cache hit without a second fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await verifyCitations(["https://example.com/cached"]);
    await verifyCitations(["https://example.com/cached"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("respects the concurrency cap", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/p${i}`);
    await verifyCitations(urls, { concurrency: 3 });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it("never throws for a malformed URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["not-a-url"]);

    expect(result.checks[0]!.verdict).not.toBe("reachable");
    expect(result.verifiedUrls).toEqual([]);
  });

  it("re-checks the SSRF guard on each redirect hop", async () => {
    // A citation host that redirects into link-local space is the classic
    // bypass: the first URL passes the guard, the hop does not.
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://example.com/redirector") {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/latest/meta-data/" },
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["https://example.com/redirector"]);

    expect(result.checks[0].verdict).not.toBe("reachable");
    expect(result.verifiedUrls).toEqual([]);
    // The metadata endpoint must never have been requested.
    const requested = fetchMock.mock.calls.map((call) => call[0]);
    expect(requested).not.toContain("http://169.254.169.254/latest/meta-data/");
  });

  it("follows a redirect to another public host", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://example.com/old") {
        return Promise.resolve(
          new Response(null, { status: 301, headers: { location: "https://example.org/new" } }),
        );
      }
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["https://example.com/old"]);

    expect(result.checks[0].verdict).toBe("reachable");
    expect(result.verifiedUrls).toEqual(["https://example.com/old"]);
  });

  it("gives up on a redirect loop instead of hanging", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "https://example.com/loop" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyCitations(["https://example.com/loop"]);

    expect(result.checks[0].verdict).toBe("unreachable");
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(5);
  });
});
