"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { HeroOverlapShell } from "@/components/marketing/heroes/hero-overlap-shell";
import { EditorialHeading } from "@/components/marketing/sections/editorial-heading";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { normalizeHttpUrl } from "@/lib/utils/normalize-url";
import { publicApiUrl } from "@/lib/marketing/site/public-api";

const CHECKS = ["Title & Meta", "Schema.org", "H1/H2 structure", "Open Graph"];

const SAMPLE_ISSUES = [
  { title: "Missing FAQ schema", severity: "High" },
  { title: "Weak meta description", severity: "Medium" },
  { title: "No llms.txt reference", severity: "Medium" },
  { title: "Heading hierarchy gap", severity: "Low" },
];

const glassCard = cardSurfaceClass("glass", false);

export function GeoAuditPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefilled = searchParams.get("url");
    if (prefilled) setUrl(prefilled);
  }, [searchParams]);

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    const auditUrl = normalizeHttpUrl(url);
    if (!auditUrl) return;
    setLoading(true);

    try {
      const res = await fetch(publicApiUrl("/api/public/geo-audits/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: auditUrl }),
      });

      const data = (await res.json().catch(() => null)) as {
        id?: number;
        audit?: { id?: number };
        error?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        if (res.status === 429) {
          toast.error(data?.message ?? "Too many audits from this network. Try again later.");
          return;
        }
        toast.error(data?.error ?? "Audit failed. Check the URL and try again.");
        return;
      }

      const auditId = data?.id ?? data?.audit?.id;
      if (!auditId) {
        toast.error("Audit completed but no result id was returned.");
        return;
      }

      router.push(`/geo-audit/${auditId}`);
    } catch {
      toast.error("Audit failed. Network error, please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Free tool"
          titleLine1="See how AI"
          titleLine2="reads your site"
          description="Check how well your page is optimised for ChatGPT, Perplexity, Google AI, and other generative engines."
          backgroundImage={HERO_IMAGES.geoAudit.hero}
          ctas={[{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "ghost" }]}
        />
      }
    >
      <HeroOverlapShell id="geo-audit-form">
        <div className="p-8 sm:p-10 md:p-12">
          <div className="inline-flex items-center gap-1.5 rounded-full editorial-badge-dark px-2.5 py-0.5 text-[11px] font-semibold mb-4 uppercase tracking-wide">
            No account required
          </div>
          <EditorialHeading
            line1="Run a free"
            line2="GEO audit"
            description="Enter the exact page URL you want to audit for AI search visibility."
            align="left"
            size="card"
            theme="dark"
            animate={false}
            className="mb-8"
          />
          <form onSubmit={handleAudit} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Input
                id="url"
                type="url"
                placeholder="https://yoursite.com/your-page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="h-12 text-base marketing-input-dark flex-1"
                aria-label="Website URL"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 shrink-0 gap-2 hero-cta-primary border-0"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" /> Auditing…
                  </>
                ) : (
                  <>
                    Run GEO audit
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-white/50">
              Schema, metadata, headings, and Open Graph — scored in seconds
            </p>
          </form>
        </div>
      </HeroOverlapShell>

      <MarketingSection
        variant="dark"
        bridgeTop
        badge="What we check"
        titleLine1="Technical signals"
        titleLine2="for AI visibility"
        description="Every audit scans the page structure, metadata, and schema that influence retrieval and citation."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {CHECKS.map((check) => (
            <div key={check} className={`${glassCard} p-4 text-center`}>
              <p className="font-medium text-sm text-white">{check}</p>
            </div>
          ))}
        </div>
        <div className={`${glassCard} p-6`}>
          <p className="text-sm font-semibold mb-4 text-white">Sample issues you might see</p>
          <div className="space-y-2">
            {SAMPLE_ISSUES.map((issue) => (
              <div
                key={issue.title}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90"
              >
                <span>{issue.title}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    issue.severity === "High"
                      ? "bg-red-500/20 text-red-200"
                      : issue.severity === "Medium"
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-white/10 text-white/60"
                  }`}
                >
                  {issue.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
