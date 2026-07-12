"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { DarkCTABand } from "@/components/marketing/dark-cta-band";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

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

type GeoAuditResultClientProps = {
  url: string;
  geoScore: number;
  issues: GeoIssue[];
};

export function GeoAuditResultClient({ url, geoScore, issues }: GeoAuditResultClientProps) {
  const passCount = issues.filter((i) => i.status === "pass").length;
  const failCount = issues.filter((i) => i.status === "fail").length;

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="GEO Audit Results"
          titleLine1={`Score ${geoScore}`}
          titleLine2="out of 100"
          description={url}
          backgroundImage={HERO_IMAGES.geoAuditResult}
          overlay={
            <div className="flex gap-6 justify-center mt-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{passCount}</p>
                <p className="text-xs text-white/60">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{failCount}</p>
                <p className="text-xs text-white/60">Issues</p>
              </div>
            </div>
          }
          ctas={[{ label: "Run new audit", href: "/geo-audit", variant: "ghost" }]}
        />
      }
    >
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="paper-card rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6 -mt-4">
          <div className="text-center">
            <p className={`text-6xl font-bold ${SCORE_COLOR(geoScore)}`}>{geoScore}</p>
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

        <div className="space-y-3">
          {issues.map((issue, i) => (
            <div key={i} className="paper-card paper-card-hover rounded-xl p-5 space-y-2">
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

      <DarkCTABand
        title="Want to fix these issues automatically?"
        description="Sign up and let goals.ac generate AI-optimised content for your site."
        primaryCta={{ label: "Get started free", href: "/signup" }}
      />
    </MarketingPageShell>
  );
}
