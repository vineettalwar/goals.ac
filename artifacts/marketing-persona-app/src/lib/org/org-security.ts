import type { OrgSecuritySettings } from "@workspace/db/schema";
import {
  assertIpAllowed as assertIpAllowedShared,
  assertMfaCompliance as assertMfaComplianceShared,
  ipMatchesAllowlist as ipMatchesAllowlistShared,
  sessionExpired as sessionExpiredShared,
  type MfaComplianceResult as SharedMfaComplianceResult,
} from "@workspace/cf-edge/org-security";

export const ipMatchesAllowlist = ipMatchesAllowlistShared;
export const sessionExpired = sessionExpiredShared;
export type MfaComplianceResult = SharedMfaComplianceResult;
export const assertMfaCompliance = assertMfaComplianceShared;

export function assertIpAllowed(
  clientIp: string | null | undefined,
  settings: OrgSecuritySettings | null | undefined,
): { ok: true } | { ok: false; error: string } {
  return assertIpAllowedShared(clientIp, settings?.allowedIps);
}
