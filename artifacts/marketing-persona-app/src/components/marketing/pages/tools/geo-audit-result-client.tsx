"use client";

import Link from "next/link";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { WaitlistForm } from "@/components/shared/waitlist-form";
import { Button } from "@/components/ui/button";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import {
  CONTACT_CTA_LABEL,
  CONTACT_HREF,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";
import { GeoAuditWriteNext } from "@/components/geo-audit/geo-audit-write-next";
import { geoAuditContentRecommendations } from "@/lib/content/geo-audit-content-recommendations";
import type { GeoIssue } from "@/components/geo-audit/geo-audit-result-view";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

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
  pageTitle?: string | null;
  schemaTypes?: string[];
  projectId?: number | null;
};

export function GeoAuditResultClient({
  url,
  geoScore,
  issues,
  pageTitle,
  schemaTypes,
  projectId,
}: GeoAuditResultClientProps) {
  const passCount = issues.filter((i) => i.status === "pass").length;
  const failCount = issues.filter((i) => i.status === "fail").length;
  const recommendations = geoAuditContentRecommendations({
    url,
    pageTitle,
    schemaTypes,
    issues,
  });

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="GEO Audit Results"
          titleLine1={`Score ${geoScore}`}
          titleLine2="out of 100"
          description={url}
          backgroundImage={HERO_IMAGES.geoAuditResult.hero}
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
        <div className={`${glassCard} p-8 flex flex-col sm:flex-row items-center gap-6 -mt-4`}>
          <div className="text-center">
            <p className={`text-6xl font-bold ${SCORE_COLOR(geoScore)}`}>{geoScore}</p>
            <p className="text-sm text-white/65 mt-1">GEO score / 100</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 w-full">
            <div className={`text-center ${glassCard} p-4`}>
              <p className="text-2xl font-bold text-emerald-400">{passCount}</p>
              <p className="text-xs text-white/65 mt-0.5">Passed</p>
            </div>
            <div className={`text-center ${glassCard} p-4`}>
              <p className="text-2xl font-bold text-red-400">{failCount}</p>
              <p className="text-xs text-white/65 mt-0.5">Issues</p>
            </div>
          </div>
        </div>

        <GeoAuditWriteNext recommendations={recommendations} projectId={projectId} />

        <div className={`${glassCard} p-6 space-y-4`}>
          <div>
            <p className="text-sm font-semibold text-white">Get the full fix plan</p>
            <p className="mt-1 text-xs text-white/60">
              Optional — results stay visible either way. Join the waitlist or start free and book a
              demo.
            </p>
          </div>
          <WaitlistForm
            featureKey="geo-audit-lead"
            variant="dark"
            buttonLabel="Email me tips"
            placeholder="you@company.com"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="hero-cta-primary border-0">
              <Link href={PRODUCT_CTA_HREF}>{PRODUCT_CTA_PRIMARY}</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link href={CONTACT_HREF}>{CONTACT_CTA_LABEL}</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.check} className={`${glassCard} p-5 space-y-2`}>
              <div className="flex items-center gap-2">
                {STATUS_ICONS[issue.status]}
                <h3 className="font-medium text-sm text-white">{issue.check}</h3>
              </div>
              <p className="text-sm text-white/65 ml-6">{issue.detail}</p>
              {issue.fix && issue.status !== "pass" && (
                <div className="ml-6 mt-1 bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-white/50 mb-0.5">Fix</p>
                  <p className="text-xs text-white/80">{issue.fix}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <DarkCTABand
        titleLine1="Want to fix these"
        titleLine2="issues automatically?"
        description="Sign up free and fix these issues with research-driven drafts, schema, and cross-platform publishing."
        primaryCta={{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF }}
        secondaryCta={{ label: CONTACT_CTA_LABEL, href: CONTACT_HREF }}
      />
    </MarketingPageShell>
  );
}
