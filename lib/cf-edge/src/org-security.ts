function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function ipv4MatchesCidr(ip: string, network: string, bits: number): boolean {
  if (bits < 0 || bits > 32) return false;
  const ipN = ipv4ToInt(ip);
  const netN = ipv4ToInt(network);
  if (ipN == null || netN == null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipN & mask) === (netN & mask);
}

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
      const slash = trimmed.lastIndexOf("/");
      const network = trimmed.slice(0, slash);
      const bits = Number(trimmed.slice(slash + 1));
      if (!network || !Number.isInteger(bits)) return clientIp === trimmed;
      if (ipv4ToInt(clientIp) != null && ipv4ToInt(network) != null) {
        return ipv4MatchesCidr(clientIp, network, bits);
      }
      return clientIp === trimmed;
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
  const issuedMs = sessionIssuedAt > 1e12 ? sessionIssuedAt : sessionIssuedAt * 1000;
  return Date.now() - issuedMs > maxSessionAgeHours * 60 * 60 * 1000;
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
