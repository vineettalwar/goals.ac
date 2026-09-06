import { afterEach, describe, expect, it, vi } from "vitest";
import { publishToWordPress, testWordPressConnection, type WordPressCredentials } from "./wordpress";

vi.mock("@workspace/security/ssrf-guard", () => ({
  assertPublicUrl: vi.fn().mockResolvedValue(undefined),
}));

const credentials: WordPressCredentials = {
  siteUrl: "https://example.test",
  username: "author",
  appPassword: "app-pass",
};

function jsonResponse(body: unknown, init?: { status?: number; ok?: boolean }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("publishToWordPress — idempotent create-or-update (BLOCK-2)", () => {
  it("creates a new post when no existing remote id is known", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 42, link: "https://example.test/?p=42" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToWordPress(credentials, "Title", "body", "publish");

    expect(result.postId).toBe(42);
    // Only one call: the create POST. No existing-post lookup happened.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/wp-json/wp/v2/posts");
    expect(init.method).toBe("POST");
  });

  it("updates the known remote post instead of creating a second one on republish", async () => {
    const fetchMock = vi
      .fn()
      // 1) lookup existing post -> found
      .mockResolvedValueOnce(jsonResponse({ id: 42 }))
      // 2) update call
      .mockResolvedValueOnce(jsonResponse({ id: 42, link: "https://example.test/?p=42" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToWordPress(
      credentials,
      "Title",
      "body",
      "publish",
      undefined,
      undefined,
      undefined,
      { existingRemoteId: "42" },
    );

    expect(result.postId).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [lookupUrl] = fetchMock.mock.calls[0]!;
    expect(String(lookupUrl)).toContain("/posts/42");
    expect(String(lookupUrl)).toContain("context=edit");
    const [updateUrl, updateInit] = fetchMock.mock.calls[1]!;
    expect(String(updateUrl)).toContain("/posts/42");
    expect(updateInit.method).toBe("PUT");
  });

  it("falls back to create when the previously recorded remote post no longer exists", async () => {
    const fetchMock = vi
      .fn()
      // 1) lookup -> 404, post was deleted remotely
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 404 }))
      // 2) create call
      .mockResolvedValueOnce(jsonResponse({ id: 99, link: "https://example.test/?p=99" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToWordPress(
      credentials,
      "Title",
      "body",
      "publish",
      undefined,
      undefined,
      undefined,
      { existingRemoteId: "42" },
    );

    expect(result.postId).toBe(99);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, createInit] = fetchMock.mock.calls[1]!;
    expect(createInit.method).toBe("POST");
  });

  it("raises a clear duplicate-risk error when the create request times out", async () => {
    const timeoutError = new DOMException("The operation was aborted.", "TimeoutError");
    const fetchMock = vi.fn().mockRejectedValue(timeoutError);
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishToWordPress(credentials, "Title", "body", "publish")).rejects.toThrow(
      /did not respond in time/i,
    );
  });
});

describe("publishToWordPress — SEO meta honesty (HIGH-1)", () => {
  it("reports no warning when WordPress echoes the sent meta back unchanged", async () => {
    const meta = { _yoast_wpseo_metadesc: "desc" };
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 1, link: "https://example.test/?p=1", meta }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToWordPress(
      credentials,
      "Title",
      "body",
      "publish",
      undefined,
      undefined,
      meta,
    );

    expect(result.metaWarning).toBeUndefined();
  });

  it("warns when WordPress drops the SEO meta instead of pretending it worked", async () => {
    const meta = { _yoast_wpseo_metadesc: "desc" };
    // Core REST silently drops unregistered meta keys — the response's meta
    // object comes back without them.
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 1, link: "https://example.test/?p=1", meta: {} }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToWordPress(
      credentials,
      "Title",
      "body",
      "publish",
      undefined,
      undefined,
      meta,
    );

    expect(result.metaWarning).toMatch(/did not confirm/i);
  });

  it("does not warn when no SEO meta was sent at all", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 1, link: "https://example.test/?p=1" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToWordPress(credentials, "Title", "body", "publish");
    expect(result.metaWarning).toBeUndefined();
  });
});

describe("testWordPressConnection — capability check (HIGH-2)", () => {
  it("requests edit context so capabilities are actually returned", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ name: "Admin", capabilities: { publish_posts: true } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await testWordPressConnection(credentials);

    expect(result.ok).toBe(true);
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("context=edit");
  });

  it("fails a Contributor-level account that cannot publish", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ name: "Contributor", capabilities: { publish_posts: false, edit_posts: true } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await testWordPressConnection(credentials);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/permission/i);
  });

  it("fails closed when capabilities are missing from the response entirely", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ name: "Someone" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await testWordPressConnection(credentials);

    // Previously this fell back to `true` and reported "Connected" even
    // though nothing confirmed publish permission.
    expect(result.ok).toBe(false);
  });
});
