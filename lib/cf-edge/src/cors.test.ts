import { describe, expect, it } from "vitest";
import { withCors } from "./cors";

describe("withCors security headers", () => {
  it("adds HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy", () => {
    const res = withCors(
      new Request("https://app.goals.ac/api/auth/me"),
      Response.json({ ok: true }),
    );
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
