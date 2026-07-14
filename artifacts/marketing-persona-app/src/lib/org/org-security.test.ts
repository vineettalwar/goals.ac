import { describe, expect, it } from "vitest";
import { assertMfaCompliance } from "./org-security";

describe("assertMfaCompliance", () => {
  it("allows access when MFA is not required", () => {
    expect(
      assertMfaCompliance({
        requireMfa: false,
        userMfaEnabled: false,
        sessionMfaVerified: false,
      }),
    ).toEqual({ ok: true });
  });

  it("requires setup when org mandates MFA but user has not enabled it", () => {
    expect(
      assertMfaCompliance({
        requireMfa: true,
        userMfaEnabled: false,
        sessionMfaVerified: false,
      }),
    ).toMatchObject({ ok: false, code: "mfa_setup_required" });
  });

  it("requires session verification when MFA is enabled", () => {
    expect(
      assertMfaCompliance({
        requireMfa: true,
        userMfaEnabled: true,
        sessionMfaVerified: false,
      }),
    ).toMatchObject({ ok: false, code: "mfa_verification_required" });
  });
});
