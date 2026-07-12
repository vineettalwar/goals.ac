import { notFound } from "next/navigation";
import { db } from "@workspace/db";
import { geoAuditsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { GeoAuditResultView, type GeoIssue } from "@/components/geo-audit-result-view";

export default async function AuditResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <div className="px-8 py-8">
      <GeoAuditResultView
        url={audit.url}
        geoScore={audit.geoScore}
        issues={issues}
        pageTitle={audit.pageTitle}
        schemaTypes={audit.schemaTypes}
        projectId={audit.websiteProjectId}
      />
    </div>
  );
}
