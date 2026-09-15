import { describe, expect, it } from "vitest";
import {
  assertMfaCompliance,
  isWorkerMfaExemptPath,
  mfaVerifiedAtLogin,
  sessionPayloadFromUser,
} from "./org-security";

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

describe("sessionPayloadFromUser", () => {
  it("sets mfaVerified false when TOTP is enabled, overridable after verify", () => {
    expect(
      sessionPayloadFromUser({
        id: 9,
        email: "a@b.com",
        name: "A",
        role: "user",
        mfaEnabled: true,
      }).mfaVerified,
    ).toBe(false);
    expect(
      sessionPayloadFromUser(
        { id: 9, email: "a@b.com", name: "A", role: "user", mfaEnabled: true },
        { mfaVerified: true },
      ).mfaVerified,
    ).toBe(true);
  });
});

describe("mfaVerifiedAtLogin", () => {
  it("marks the session verified when TOTP is off", () => {
    expect(mfaVerifiedAtLogin(false)).toBe(true);
  });

  it("requires a TOTP challenge when TOTP is on", () => {
    expect(mfaVerifiedAtLogin(true)).toBe(false);
  });
});

describe("isWorkerMfaExemptPath", () => {
  it("exempts MFA routes and GET /api/auth/me", () => {
    expect(isWorkerMfaExemptPath("/api/auth/mfa/setup", "GET")).toBe(true);
    expect(isWorkerMfaExemptPath("/api/auth/mfa/verify", "POST")).toBe(true);
    expect(isWorkerMfaExemptPath("/api/auth/me", "GET")).toBe(true);
    expect(isWorkerMfaExemptPath("/api/auth/me", "PATCH")).toBe(false);
    expect(isWorkerMfaExemptPath("/api/website-projects", "GET")).toBe(false);
  });
});
