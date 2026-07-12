import { describe, expect, it } from "vitest";
import { assertPublicUrlSync } from "./ssrf-guard";

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
