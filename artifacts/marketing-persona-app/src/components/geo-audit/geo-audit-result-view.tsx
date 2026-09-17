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

      <div className="space-y-4 border-b border-border pb-6">
        <div>
          <p className="text-sm text-muted-foreground">This page (not a full-site crawl)</p>
          <p className="truncate font-medium">{url.replace(/^https?:\/\//, "")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Site-wide issues live under Search → Site.
          </p>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{geoScore}</p>
          <p className="text-sm text-muted-foreground">
            {passCount} passed · {failCount} issues
          </p>
        </div>
      </div>

      <GeoAuditWriteNext recommendations={recommendations} projectId={projectId} />

      <div className="space-y-3">
        {issues.map((issue) => (
          <div key={issue.check} className="space-y-2 border-b border-border py-4 last:border-0">
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
