import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { geoAuditsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { GeoAuditResultClient } from "@/components/marketing/pages/geo-audit-result-client";
import type { GeoIssue } from "@/components/geo-audit/geo-audit-result-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return { title: "GEO Audit" };

  try {
    const [audit] = await db
      .select({ url: geoAuditsTable.url, geoScore: geoAuditsTable.geoScore })
      .from(geoAuditsTable)
      .where(eq(geoAuditsTable.id, numericId))
      .limit(1);

    if (!audit) return { title: "GEO Audit not found" };

    return {
      title: `GEO Audit | ${audit.geoScore}/100`,
      description: `Generative engine optimization audit results for ${audit.url}.`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "GEO Audit Results" };
  }
}

export default async function GeoAuditResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) notFound();

  let audit:
    | {
        url: string;
        geoScore: number;
        issues: unknown;
        pageTitle: string | null;
        schemaTypes: string[];
        websiteProjectId: number | null;
      }
    | undefined;

  try {
    [audit] = await db
      .select({
        url: geoAuditsTable.url,
        geoScore: geoAuditsTable.geoScore,
        issues: geoAuditsTable.issues,
        pageTitle: geoAuditsTable.pageTitle,
        schemaTypes: geoAuditsTable.schemaTypes,
        websiteProjectId: geoAuditsTable.websiteProjectId,
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
    <GeoAuditResultClient
      url={audit.url}
      geoScore={audit.geoScore}
      issues={issues}
      pageTitle={audit.pageTitle}
      schemaTypes={audit.schemaTypes}
      projectId={audit.websiteProjectId}
    />
  );
}
