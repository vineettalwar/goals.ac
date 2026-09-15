import { afterEach, describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({
  default: { lookup },
  lookup,
}));

import { assertPublicUrl, assertPublicUrlSync } from "./ssrf-guard";

describe("SSRF guard (synchronous validation)", () => {
  it.each([
    "https://goals.ac/path",
    "http://93.184.216.34/resource",
  ])("allows a syntactically public HTTP URL: %s", (url) => {
    expect(() => assertPublicUrlSync(url)).not.toThrow();
  });

  it.each([
    "http://localhost:8080",
    "http://api.internal/data",
    "http://127.0.0.1/admin",
    "http://10.1.2.3",
    "http://172.16.0.1",
    "http://192.168.1.1",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "http://[fd00::1]/",
  ])("blocks private or reserved targets: %s", (url) => {
    expect(() => assertPublicUrlSync(url)).toThrow(/private\/reserved/);
  });

  it.each(["file:///etc/passwd", "ftp://goals.ac/file", "javascript:alert(1)"])(
    "blocks non-HTTP protocols: %s",
    (url) => expect(() => assertPublicUrlSync(url)).toThrow("Only http/https URLs are allowed"),
  );

  it("rejects malformed URLs", () => {
    expect(() => assertPublicUrlSync("not a url")).toThrow("Invalid URL");
  });
});

describe("SSRF guard (async DNS)", () => {
  afterEach(() => {
    lookup.mockReset();
    vi.unstubAllGlobals();
  });

  it("skips DNS on Cloudflare Workers (hostname checks still apply)", async () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    await expect(assertPublicUrl("https://goals.ac")).resolves.toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
    await expect(assertPublicUrl("http://127.0.0.1")).rejects.toThrow(/private\/reserved/);
  });

  it("skips DNS when the lookup API is unimplemented", async () => {
    lookup.mockRejectedValue(Object.assign(new Error("not implemented"), { code: "ENOTIMP" }));
    await expect(assertPublicUrl("https://goals.ac")).resolves.toBeUndefined();
  });

  it("still blocks a hostname that resolves to a private address", async () => {
    lookup.mockImplementation(async (_host: string, opts: { family: number }) => {
      if (opts.family === 4) return { address: "127.0.0.1", family: 4 };
      throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
    });
    await expect(assertPublicUrl("https://goals.ac")).rejects.toThrow(/private\/reserved/);
  });
});
