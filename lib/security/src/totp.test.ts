import { describe, expect, it } from "vitest";
import { currentTotpCode, generateTotpSecret, verifyTotpCode } from "./totp";

describe("totp", () => {
  it("verifies a freshly generated code", () => {
    const secret = generateTotpSecret();
    const code = currentTotpCode(secret);
    expect(verifyTotpCode(secret, code)).toBe(true);
  });

  it("rejects invalid codes", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode(secret, "000000")).toBe(false);
    expect(verifyTotpCode(secret, "abc")).toBe(false);
  });
});
