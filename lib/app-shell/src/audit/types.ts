import type { ReactNode } from "react";

export type AuditLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type GeoAuditListItem = {
  id: number;
  url: string;
  geoScore: number;
  createdAt: number | string;
};

export type GeoIssue = {
  check: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  fix: string;
};

export type GeoAuditDetail = {
  id: number;
  url: string;
  geoScore: number;
  createdAt: number | string;
  pageTitle?: string | null;
  metaDescription?: string | null;
  hasSchemaOrg?: boolean;
  schemaTypes?: string[];
  h1Count?: number;
  imageCount?: number;
  imagesMissingAlt?: number;
  issues?: GeoIssue[];
  [key: string]: unknown;
};

export function auditDetailPath(auditId: number | string): string {
  return `/audit/${auditId}`;
}

export function formatAuditDate(value: number | string | undefined): string {
  if (value == null) return "—";
  const ms = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function geoScoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}
