import type { OrgSecuritySettings } from "@workspace/db/schema";

export function ipMatchesAllowlist(clientIp: string | null | undefined, allowedIps?: string[]): boolean {
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
  settings: OrgSecuritySettings | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!ipMatchesAllowlist(clientIp, settings?.allowedIps)) {
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
