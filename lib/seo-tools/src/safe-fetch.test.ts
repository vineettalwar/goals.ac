import { describe, expect, it, vi, afterEach } from "vitest";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";

vi.mock("@workspace/security/ssrf-guard", () => ({
  assertPublicUrl: vi.fn(async () => undefined),
}));

describe("fetchPublicText redirect SSRF", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("re-checks assertPublicUrl on each redirect hop", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "https://evil.example/next" },
        }),
      )
      .mockResolvedValueOnce(new Response("ok-body", { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const { fetchPublicText } = await import("./safe-fetch");
    const body = await fetchPublicText("https://safe.example/", { fetchImpl: fetchMock });

    expect(body).toBe("ok-body");
    expect(assertPublicUrl).toHaveBeenCalledWith("https://safe.example/");
    expect(assertPublicUrl).toHaveBeenCalledWith("https://evil.example/next");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
  });
});
