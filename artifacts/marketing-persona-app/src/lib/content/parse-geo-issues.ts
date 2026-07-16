import type { GeoIssue } from "@/components/geo-audit/geo-audit-result-view";

/** D1 / API may return issues as JSON array or a stringified JSON blob. */
export function parseGeoIssues(raw: unknown): GeoIssue[] {
  if (Array.isArray(raw)) return raw as GeoIssue[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as GeoIssue[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}
