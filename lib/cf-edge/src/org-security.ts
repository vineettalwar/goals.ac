export function ipMatchesAllowlist(
  clientIp: string | null | undefined,
  allowedIps?: string[],
): boolean {
  if (!allowedIps || allowedIps.length === 0) return true;
  if (!clientIp) return false;
  return allowedIps.some((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return false;
    if (trimmed.includes("/")) {
      const [network, bits] = trimmed.split("/");
      if (!network || !bits) return clientIp === trimmed;
      const prefix = network.split(".").slice(0, Math.ceil(Number(bits) / 8)).join(".");
      return clientIp.startsWith(prefix);
    }
    return clientIp === trimmed;
  });
}

export function assertIpAllowed(
  clientIp: string | null | undefined,
  allowedIps?: string[],
): { ok: true } | { ok: false; error: string } {
  if (!ipMatchesAllowlist(clientIp, allowedIps)) {
    return { ok: false, error: "Access denied from this IP address" };
  }
  return { ok: true };
}

export function sessionExpired(
  sessionIssuedAt: number | undefined,
  maxSessionAgeHours: number | undefined,
): boolean {
  if (!maxSessionAgeHours || !sessionIssuedAt) return false;
  const maxMs = maxSessionAgeHours * 60 * 60 * 1000;
  return Date.now() - sessionIssuedAt > maxMs;
}

export type MfaComplianceResult =
  | { ok: true }
  | { ok: false; error: string; code: "mfa_setup_required" | "mfa_verification_required" };

export function assertMfaCompliance(input: {
  requireMfa?: boolean;
  userMfaEnabled: boolean;
  sessionMfaVerified: boolean;
}): MfaComplianceResult {
  if (!input.requireMfa) {
    return { ok: true };
  }

  if (!input.userMfaEnabled) {
    return {
      ok: false,
      error:
        "Your organization requires two-factor authentication. Enable TOTP in account settings.",
      code: "mfa_setup_required",
    };
  }

  if (!input.sessionMfaVerified) {
    return {
      ok: false,
      error: "Two-factor verification required for this session.",
      code: "mfa_verification_required",
    };
  }

  return { ok: true };
}

/** Login/OAuth: a session is verified until the user has TOTP enabled. */
export function mfaVerifiedAtLogin(mfaEnabled: boolean): boolean {
  return !mfaEnabled;
}

export function sessionPayloadFromUser(
  user: {
    id: number;
    email: string;
    name: string | null;
    role: string;
    mfaEnabled?: boolean | null;
  },
  extras?: Record<string, unknown>,
): {
  id: string;
  email: string;
  name: string | null;
  role: string;
  mfaVerified: boolean;
} & Record<string, unknown> {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    mfaVerified: mfaVerifiedAtLogin(Boolean(user.mfaEnabled)),
    ...extras,
  };
}

export function clientIpFromRequest(request: Request): string | undefined {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined
  );
}

export function isWorkerMfaExemptPath(path: string, method: string): boolean {
  if (path.startsWith("/api/auth/mfa/")) return true;
  return path === "/api/auth/me" && method === "GET";
}
