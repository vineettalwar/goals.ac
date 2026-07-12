import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@workspace/db";
import { geoAuditsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface GeoIssue {
  check: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  fix: string;
}

const STATUS_ICONS = {
  pass: <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />,
  fail: <XCircle className="h-4 w-4 text-red-600 shrink-0" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
};

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "text-green-700" : score >= 60 ? "text-amber-600" : "text-red-600";

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
  const passCount = issues.filter((i) => i.status === "pass").length;
  const failCount = issues.filter((i) => i.status === "fail").length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <div>
        <Link href="/geo-audit" className="text-sm text-muted-foreground hover:text-foreground">← New audit</Link>
        <h1 className="text-2xl font-bold mt-3">GEO Audit Results</h1>
        <p className="text-sm text-muted-foreground mt-1 break-all">{audit.url}</p>
      </div>

      <div className="paper-card rounded-xl p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="text-center">
          <p className={`text-6xl font-bold ${SCORE_COLOR(audit.geoScore)}`}>{audit.geoScore}</p>
          <p className="text-sm text-muted-foreground mt-1">GEO score / 100</p>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="text-center paper-card rounded-xl p-4">
            <p className="text-2xl font-bold text-green-700">{passCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Passed</p>
          </div>
          <div className="text-center paper-card rounded-xl p-4">
            <p className="text-2xl font-bold text-red-600">{failCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Issues</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {issues.map((issue, i) => (
          <div key={i} className="paper-card rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              {STATUS_ICONS[issue.status]}
              <h3 className="font-medium text-sm">{issue.check}</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-6">{issue.detail}</p>
            {issue.fix && issue.status !== "pass" && (
              <div className="ml-6 mt-1 bg-muted rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground mb-0.5">Fix</p>
                <p className="text-xs">{issue.fix}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="paper-card rounded-xl p-6 text-center space-y-3">
        <p className="font-semibold">Want to fix these issues automatically?</p>
        <p className="text-sm text-muted-foreground">Sign up and let goals.ac generate AI-optimised content for your site.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium">
          Get started free
        </Link>
      </div>
    </div>
  );
}
