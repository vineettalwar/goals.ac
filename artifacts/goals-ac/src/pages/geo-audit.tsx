import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, ArrowLeft, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type GeoIssue = {
  check: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  fix: string;
};

type GeoAudit = {
  id: number;
  url: string;
  geoScore: number;
  issues: GeoIssue[];
  pageTitle: string | null;
  metaDescription: string | null;
  hasSchemaOrg: boolean;
  schemaTypes: string[];
  h1Count: number;
  imageCount: number;
  imagesMissingAlt: number;
  roadmapId: number | null;
  createdAt: string;
};

function ScoreBadge({ score }: { score: number }) {
  if (score >= 75) return <span className="text-green-500">{score}</span>;
  if (score >= 50) return <span className="text-yellow-500">{score}</span>;
  return <span className="text-red-500">{score}</span>;
}

function StatusBadge({ status }: { status: "pass" | "fail" | "warn" }) {
  if (status === "pass") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Pass
      </Badge>
    );
  }
  if (status === "fail") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 gap-1">
        <XCircle className="w-3 h-3" /> Fail
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 gap-1">
      <AlertTriangle className="w-3 h-3" /> Warn
    </Badge>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference / 4}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold leading-none" style={{ color }}>
          {score}
        </div>
        <div className="text-xs text-muted-foreground mt-1">GEO Score</div>
      </div>
    </div>
  );
}

export default function GeoAuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roadmapId = searchParams.get("roadmap_id");

  const [audit, setAudit] = useState<GeoAudit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    fetch(`${BASE}/api/geo-audits/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setAudit(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsError(true);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-12 max-w-4xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !audit) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-8 py-24 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Audit Not Found</h1>
          <p className="text-muted-foreground mb-8">This audit does not exist or has been removed.</p>
          <Button onClick={() => navigate("/geo-audit")} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Run New Audit
          </Button>
        </div>
      </Layout>
    );
  }

  const failCount = audit.issues.filter((i) => i.status === "fail").length;
  const warnCount = audit.issues.filter((i) => i.status === "warn").length;
  const passCount = audit.issues.filter((i) => i.status === "pass").length;

  const scoreLabel =
    audit.geoScore >= 75
      ? "Strong AI visibility"
      : audit.geoScore >= 50
      ? "Moderate AI visibility"
      : "Poor AI visibility";

  return (
    <Layout>
      <SEO
        title={`GEO Audit: ${audit.url} — Score ${audit.geoScore}/100 | goals.ac`}
        description={`GEO score of ${audit.geoScore}/100 for ${audit.url}. ${failCount} issues, ${warnCount} warnings.`}
      />

      {/* Header */}
      <div className="bg-zinc-950 text-zinc-50 py-12 md:py-16 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-zinc-400">
            {roadmapId ? (
              <Link
                to={`/roadmap/${roadmapId}`}
                className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Roadmap
              </Link>
            ) : (
              <button
                onClick={() => navigate("/geo-audit")}
                className="flex items-center gap-1.5 hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Run New Audit
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <ScoreRing score={audit.geoScore} />

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                GEO Audit Results
              </h1>
              <a
                href={audit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors text-sm mb-4 break-all"
              >
                {audit.url}
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
              <p className="text-zinc-300 text-lg">{scoreLabel}</p>
              {audit.pageTitle && (
                <p className="text-zinc-500 text-sm mt-1">"{audit.pageTitle}"</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-10 max-w-4xl space-y-8">
        {/* Summary counts */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-5 text-center">
              <div className="text-3xl font-bold text-red-600">{failCount}</div>
              <div className="text-sm text-red-700 mt-1 font-medium">
                {failCount === 1 ? "Issue" : "Issues"}
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-5 text-center">
              <div className="text-3xl font-bold text-yellow-600">{warnCount}</div>
              <div className="text-sm text-yellow-700 mt-1 font-medium">
                {warnCount === 1 ? "Warning" : "Warnings"}
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-5 text-center">
              <div className="text-3xl font-bold text-green-600">{passCount}</div>
              <div className="text-sm text-green-700 mt-1 font-medium">Passing</div>
            </CardContent>
          </Card>
        </div>

        {/* Issues table */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Check Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Check</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="hidden md:table-cell">Fix Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.issues.map((issue) => (
                  <TableRow key={issue.check}>
                    <TableCell className="font-medium">{issue.check}</TableCell>
                    <TableCell>
                      <StatusBadge status={issue.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{issue.detail}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {issue.fix || <span className="text-green-600 font-medium">No action needed</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile fix recommendations */}
        <div className="md:hidden space-y-3">
          {audit.issues
            .filter((i) => i.status !== "pass")
            .map((issue) => (
              <Card key={issue.check} className="border-border/60">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={issue.status} />
                    <span className="font-medium text-sm">{issue.check}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{issue.fix}</p>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Page metadata */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Page Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <div className="text-muted-foreground">Page Title</div>
              <div className="font-medium">{audit.pageTitle || <span className="text-red-500">Missing</span>}</div>

              <div className="text-muted-foreground">Meta Description</div>
              <div className="font-medium">
                {audit.metaDescription ? (
                  <span className="line-clamp-2">{audit.metaDescription}</span>
                ) : (
                  <span className="text-red-500">Missing</span>
                )}
              </div>

              <div className="text-muted-foreground">Schema.org Types</div>
              <div className="font-medium">
                {audit.schemaTypes.length > 0 ? audit.schemaTypes.join(", ") : <span className="text-red-500">None</span>}
              </div>

              <div className="text-muted-foreground">H1 Tags</div>
              <div className="font-medium">{audit.h1Count}</div>

              <div className="text-muted-foreground">Images</div>
              <div className="font-medium">
                {audit.imageCount} total
                {audit.imagesMissingAlt > 0 && (
                  <span className="text-red-500 ml-1">({audit.imagesMissingAlt} missing alt)</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button onClick={() => navigate("/geo-audit")} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Run New Audit
          </Button>
          {audit.roadmapId && (
            <Button asChild variant="outline" className="gap-2">
              <Link to={`/roadmap/${audit.roadmapId}`}>
                <ArrowLeft className="w-4 h-4" /> Back to Roadmap
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
