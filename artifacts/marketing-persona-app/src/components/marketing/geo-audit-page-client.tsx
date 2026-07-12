"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { HeroOverlapShell } from "@/components/marketing/hero-overlap-shell";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { cardSurfaceClass } from "@/lib/marketing-surfaces";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

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
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);

    const res = await fetch("/api/geo-audits/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    setLoading(false);
    if (!res.ok) {
      toast.error("Audit failed — please check the URL and try again");
      return;
    }
    const data = await res.json();
    router.push(`/geo-audit/${data.id ?? data.audit?.id}`);
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
          ctas={[{ label: "Run audit below", href: "#geo-audit-form", variant: "primary" }]}
        />
      }
    >
      <HeroOverlapShell id="geo-audit-form">
        <div className="p-8 md:p-10">
          <div className="inline-flex items-center gap-1.5 rounded-full editorial-badge-light px-2.5 py-0.5 text-[11px] font-semibold mb-4 uppercase tracking-wide">
            No account required
          </div>
          <EditorialHeading
            line1="Run a free"
            line2="GEO audit"
            description="Enter the exact page URL you want to audit for AI search visibility."
            align="left"
            size="card"
            animate={false}
            className="mb-6"
          />
          <form onSubmit={handleAudit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://yoursite.com/your-page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 hero-cta-primary rounded-xl" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" /> Auditing…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Run GEO audit
                </>
              )}
            </Button>
          </form>
        </div>
      </HeroOverlapShell>

      <MarketingSection
        variant="image"
        backgroundImage={HERO_IMAGES.geoAudit.checks}
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
