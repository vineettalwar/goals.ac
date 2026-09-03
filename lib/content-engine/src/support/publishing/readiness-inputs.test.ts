import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyCitationsMock = vi.hoisted(() =>
  vi.fn(async (urls: string[]) => ({
    checks: urls.map((url) => ({ url, verdict: "reachable" as const })),
    verifiedUrls: urls,
  })),
);

vi.mock("../../content/citation-verifier", () => ({
  verifyCitations: verifyCitationsMock,
}));

vi.mock("../../core/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { collectReadinessInputs, MAX_CITATION_URLS_PER_PIECE } from "./readiness-inputs";

beforeEach(() => {
  verifyCitationsMock.mockClear();
  verifyCitationsMock.mockImplementation(async (urls: string[]) => ({
    checks: urls.map((url) => ({ url, verdict: "reachable" as const })),
    verifiedUrls: urls,
  }));
});

describe("collectReadinessInputs", () => {
  it("returns knownSlugs undefined, not [], when no siteGraphFetcher is supplied", async () => {
    const result = await collectReadinessInputs({ bodyMarkdown: "Body with [a link](/some-slug)." });
    expect(result.knownSlugs).toBeUndefined();
  });

  it("returns knownSlugs undefined, not [], when the site graph fetch throws", async () => {
    const result = await collectReadinessInputs({
      bodyMarkdown: "Body with [a link](/some-slug).",
      siteGraphFetcher: async () => {
        throw new Error("plugin unreachable");
      },
    });
    expect(result.knownSlugs).toBeUndefined();
  });

  it("returns knownSlugs undefined, not [], when the site graph fetch resolves to null", async () => {
    const result = await collectReadinessInputs({
      bodyMarkdown: "Body.",
      siteGraphFetcher: async () => null,
    });
    expect(result.knownSlugs).toBeUndefined();
  });

  it("maps site graph posts to their slugs when the fetch succeeds", async () => {
    const result = await collectReadinessInputs({
      bodyMarkdown: "Body.",
      siteGraphFetcher: async () => ({ posts: [{ slug: "post-a" }, { slug: "post-b" }, { slug: null }] }),
    });
    expect(result.knownSlugs).toEqual(["post-a", "post-b"]);
  });

  it("returns verifiedCitationUrls [] (not undefined) when there is nothing to verify", async () => {
    const result = await collectReadinessInputs({ bodyMarkdown: "No links here at all." });
    expect(result.verifiedCitationUrls).toEqual([]);
    expect(verifyCitationsMock).not.toHaveBeenCalled();
  });

  it("returns verifiedCitationUrls undefined when verification errors out wholesale", async () => {
    verifyCitationsMock.mockRejectedValueOnce(new Error("dns exploded"));
    const result = await collectReadinessInputs({
      bodyMarkdown: "See [a source](https://example.com/a).",
    });
    expect(result.verifiedCitationUrls).toBeUndefined();
  });

  it("extracts citation URLs from both the body and the citations field, deduped", async () => {
    const result = await collectReadinessInputs({
      bodyMarkdown: "See [source](https://example.com/a) for details.",
      citations: [{ url: "https://example.com/a" }, { url: "https://example.com/b" }],
    });
    expect(result.verifiedCitationUrls).toEqual(["https://example.com/a", "https://example.com/b"]);
    expect(verifyCitationsMock).toHaveBeenCalledWith(
      ["https://example.com/a", "https://example.com/b"],
      undefined,
    );
  });

  it("caps the number of URLs verified per piece", async () => {
    const citations = Array.from({ length: MAX_CITATION_URLS_PER_PIECE + 10 }, (_, i) => ({
      url: `https://example.com/source-${i}`,
    }));
    await collectReadinessInputs({ bodyMarkdown: "Body.", citations });

    expect(verifyCitationsMock).toHaveBeenCalledOnce();
    const [urls] = verifyCitationsMock.mock.calls[0]!;
    expect((urls as string[]).length).toBe(MAX_CITATION_URLS_PER_PIECE);
  });

  it("never throws even when both inputs fail", async () => {
    verifyCitationsMock.mockRejectedValueOnce(new Error("network down"));
    await expect(
      collectReadinessInputs({
        bodyMarkdown: "See [a source](https://example.com/a).",
        siteGraphFetcher: async () => {
          throw new Error("plugin unreachable");
        },
      }),
    ).resolves.toEqual({ knownSlugs: undefined, verifiedCitationUrls: undefined });
  });
});
