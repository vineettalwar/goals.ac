import { describe, expect, it, vi, beforeEach } from "vitest";
import { inspectUrl } from "./gscUrlInspection";

const EXPECTED_URL =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

describe("inspectUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends correct request URL, body, and auth header", async () => {
    const mockResponse = {
      inspectionResult: {
        indexStatusResult: {
          verdict: "PASS",
          coverageState: "Submitted and indexed",
          robotsTxtState: "ALLOWED",
          indexingState: "INDEXING_ALLOWED",
          lastCrawlTime: "2026-09-01T10:00:00Z",
          pageFetchState: "SUCCESSFUL",
          googleCanonical: "https://example.com/page",
          userCanonical: "https://example.com/page",
        },
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await inspectUrl({
      accessToken: "test-token-123",
      siteUrl: "sc-domain:example.com",
      inspectionUrl: "https://example.com/page",
      languageCode: "en",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(EXPECTED_URL);
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer test-token-123",
    );
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({
      siteUrl: "sc-domain:example.com",
      inspectionUrl: "https://example.com/page",
      languageCode: "en",
    });

    expect(result.inspectionUrl).toBe("https://example.com/page");
    expect(result.indexStatusResult?.verdict).toBe("PASS");
    expect(result.indexStatusResult?.coverageState).toBe("Submitted and indexed");
    expect(result.indexStatusResult?.googleCanonical).toBe("https://example.com/page");
    expect(result.raw).toEqual(mockResponse.inspectionResult);
  });

  it("omits languageCode when not provided", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ inspectionResult: {} }), { status: 200 }),
    );

    await inspectUrl({
      accessToken: "tok",
      siteUrl: "sc-domain:example.com",
      inspectionUrl: "https://example.com/p",
    });

    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body as string,
    );
    expect(body).toEqual({
      siteUrl: "sc-domain:example.com",
      inspectionUrl: "https://example.com/p",
    });
    expect(body.languageCode).toBeUndefined();
  });

  it("returns null indexStatusResult when API omits it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ inspectionResult: {} }), { status: 200 }),
    );

    const result = await inspectUrl({
      accessToken: "tok",
      siteUrl: "sc-domain:x.com",
      inspectionUrl: "https://x.com/a",
    });

    expect(result.indexStatusResult).toBeNull();
  });

  it("throws on non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Forbidden", { status: 403 }),
    );

    await expect(
      inspectUrl({
        accessToken: "bad",
        siteUrl: "sc-domain:x.com",
        inspectionUrl: "https://x.com/a",
      }),
    ).rejects.toThrow("GSC URL Inspection failed (403)");
  });
});
