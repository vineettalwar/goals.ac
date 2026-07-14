import Link from "next/link";
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeoAuditWriteNext } from "@/components/geo-audit/geo-audit-write-next";
import { geoAuditContentRecommendations } from "@/lib/content/geo-audit-content-recommendations";

export interface GeoIssue {
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

type GeoAuditResultViewProps = {
  url: string;
  geoScore: number;
  issues: GeoIssue[];
  backHref?: string;
  pageTitle?: string | null;
  schemaTypes?: string[];
  projectId?: number | null;
};

export function GeoAuditResultView({
  url,
  geoScore,
  issues,
  backHref = "/audit",
  pageTitle,
  schemaTypes,
  projectId,
}: GeoAuditResultViewProps) {
  const passCount = issues.filter((i) => i.status === "pass").length;
  const failCount = issues.filter((i) => i.status === "fail").length;
  const recommendations = geoAuditContentRecommendations({
    url,
    pageTitle,
    schemaTypes,
    issues,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to GEO audits
        </Link>
      </Button>

      <div className="paper-card rounded-2xl p-6 sm:p-8 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Audited URL</p>
          <p className="font-medium truncate">{url.replace(/^https?:\/\//, "")}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <p className={`text-5xl font-bold ${SCORE_COLOR(geoScore)}`}>{geoScore}</p>
            <p className="text-sm text-muted-foreground mt-1">GEO score / 100</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 w-full">
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
      </div>

      <GeoAuditWriteNext recommendations={recommendations} projectId={projectId} />

      <div className="space-y-3">
        {issues.map((issue) => (
          <div key={issue.check} className="paper-card paper-card-hover rounded-xl p-5 space-y-2">
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
    </div>
  );
}
