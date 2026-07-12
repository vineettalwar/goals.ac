import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { geoAuditsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { GeoAuditResultClient } from "@/components/marketing/geo-audit-result-client";

interface GeoIssue {
  check: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  fix: string;
}

export default async function GeoAuditResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) notFound();

  let audit: { url: string; geoScore: number; issues: unknown; createdAt: Date } | undefined;

  try {
    [audit] = await db
      .select({
        url: geoAuditsTable.url,
        geoScore: geoAuditsTable.geoScore,
        issues: geoAuditsTable.issues,
        createdAt: geoAuditsTable.createdAt,
      })
      .from(geoAuditsTable)
      .where(eq(geoAuditsTable.id, numericId))
      .limit(1);
  } catch {
    notFound();
  }

  if (!audit) notFound();

  const issues = (audit.issues ?? []) as GeoIssue[];

  return (
    <GeoAuditResultClient url={audit.url} geoScore={audit.geoScore} issues={issues} />
  );
}
