import { afterEach, describe, expect, it, vi } from "vitest";
import { pickExcerpt, publishToWordPress, testWordPressConnection, type WordPressCredentials } from "./wordpress";

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

  it("updates by slug when no remote id is known (timed-out first create hole)", async () => {
    const fetchMock = vi
      .fn()
      // 1) slug lookup -> found
      .mockResolvedValueOnce(jsonResponse([{ id: 77, link: "https://example.test/?p=77" }]))
      // 2) update
      .mockResolvedValueOnce(jsonResponse({ id: 77, link: "https://example.test/?p=77" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await publishToWordPress(
      credentials,
      "My Post Title",
      "body",
      "publish",
      undefined,
      undefined,
      undefined,
      { slug: "my-post-title" },
    );

    expect(result.postId).toBe(77);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("slug=my-post-title");
    expect(fetchMock.mock.calls[1]![1].method).toBe("PUT");
  });

  it("sets slug on create when lookup misses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ id: 5, link: "https://example.test/?p=5" }));
    vi.stubGlobal("fetch", fetchMock);

    await publishToWordPress(
      credentials,
      "Fresh Title",
      "body",
      "publish",
      undefined,
      undefined,
      undefined,
      { slug: "fresh-title" },
    );

    const [, createInit] = fetchMock.mock.calls[1]!;
    expect(createInit.method).toBe("POST");
    const sent = JSON.parse(createInit.body as string) as { slug?: string };
    expect(sent.slug).toBe("fresh-title");
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

describe("pickExcerpt — excerpt from meta description (HIGH-1)", () => {
  it("prefers explicit metaDescription over meta bag keys", () => {
    expect(pickExcerpt("explicit desc", { _yoast_wpseo_metadesc: "yoast desc" })).toBe("explicit desc");
  });

  it("falls back to the first known description key in meta", () => {
    expect(pickExcerpt(undefined, { rank_math_description: "rm desc" })).toBe("rm desc");
  });

  it("returns undefined when nothing useful is available", () => {
    expect(pickExcerpt(undefined, undefined)).toBeUndefined();
    expect(pickExcerpt("", {})).toBeUndefined();
    expect(pickExcerpt("  ", { rank_math_title: "title only" })).toBeUndefined();
  });
});

describe("publishToWordPress — excerpt is set from meta description (HIGH-1)", () => {
  it("sends excerpt alongside meta in the request body", async () => {
    const meta = { _yoast_wpseo_metadesc: "SEO description" };
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 1, link: "https://example.test/?p=1", meta }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await publishToWordPress(credentials, "Title", "body", "publish", undefined, undefined, meta);

    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(sent.excerpt).toBe("SEO description");
  });

  it("uses explicit metaDescription for excerpt even without meta bag", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 1, link: "https://example.test/?p=1" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await publishToWordPress(credentials, "Title", "body", "publish", "My desc");

    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(sent.excerpt).toBe("My desc");
  });
});

describe("wordpressSlugFromUrl / findWordPressPostByUrl", () => {
  it("extracts the last path segment as slug", async () => {
    const { wordpressSlugFromUrl } = await import("./wordpress");
    expect(wordpressSlugFromUrl("https://example.test/blog/my-post/")).toBe("my-post");
  });

  it("looks up a post by slug", async () => {
    const { findWordPressPostByUrl } = await import("./wordpress");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([{ id: 99, link: "https://example.test/blog/my-post/" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const match = await findWordPressPostByUrl(
      credentials,
      "https://example.test/blog/my-post/",
    );
    expect(match?.id).toBe(99);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("slug=my-post");
  });
});
