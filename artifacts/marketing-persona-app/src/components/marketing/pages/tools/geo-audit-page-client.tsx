"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { HeroOverlapShell } from "@/components/marketing/heroes/hero-overlap-shell";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { normalizeHttpUrl } from "@/lib/utils/normalize-url";
import { publicApiUrl } from "@/lib/marketing/site/public-api";

const CHECKS = ["Title & Meta", "Schema.org", "H1/H2 structure", "Open Graph"];

const SAMPLE_ISSUES = [
  { title: "Missing FAQ schema", severity: "High" },
  { title: "Weak meta description", severity: "Medium" },
  { title: "No llms.txt reference", severity: "Medium" },
  { title: "Heading hierarchy gap", severity: "Low" },
];

export function GeoAuditPageClient() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefilled = new URLSearchParams(window.location.search).get("url");
    if (prefilled) setUrl(prefilled);
  }, []);

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault();
    const auditUrl = normalizeHttpUrl(url);
    if (!auditUrl) return;
    setLoading(true);
    setError(null);

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
          setError(data?.message ?? "Too many audits from this network. Try again later.");
          return;
        }
        setError(data?.error ?? "Audit failed. Check the URL and try again.");
        return;
      }

      const auditId = data?.id ?? data?.audit?.id;
      if (!auditId) {
        setError("Audit completed but no result id was returned.");
        return;
      }

      // Static marketing (Pages) only prebuilds /geo-audit/0/; hard-nav hits the Pages rewrite.
      if (process.env.MARKETING_STATIC === "1") {
        window.location.assign(`/geo-audit/${auditId}/`);
        return;
      }
      router.push(`/geo-audit/${auditId}`);
    } catch {
      setError("Audit failed. Network error, please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingPageShell
      hero={
        <PageHero
          titleLine1="See how AI"
          titleLine2="reads your site"
          description="Check how well your page is optimised for ChatGPT, Perplexity, Google AI, and other generative engines."
          backgroundImage={HERO_IMAGES.geoAudit.hero}
          ctas={[
            { label: "Run free audit", href: "#geo-audit-form", variant: "primary" },
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "ghost" },
          ]}
        />
      }
    >
      <HeroOverlapShell id="geo-audit-form">
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
          <p className="text-xs text-white/70">
            Schema, metadata, headings, and Open Graph — scored in seconds
          </p>
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </HeroOverlapShell>

      <MarketingSection
        variant="dark"
        bridgeTop
        titleLine1="Technical signals"
        titleLine2="for AI visibility"
        description="Every audit scans the page structure, metadata, and schema that influence retrieval and citation."
      >
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mb-12 max-w-3xl mx-auto text-center sm:text-left">
          {CHECKS.map((check) => (
            <li key={check} className="text-sm font-medium text-white/85 border-t border-white/15 pt-3">
              {check}
            </li>
          ))}
        </ul>
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-medium text-white/70 mb-3">Sample issues you might see</p>
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {SAMPLE_ISSUES.map((issue) => (
              <li
                key={issue.title}
                className="flex items-center justify-between gap-4 py-3.5 text-sm text-white/90"
              >
                <span>{issue.title}</span>
                <span
                  className={`text-xs font-medium ${
                    issue.severity === "High"
                      ? "text-red-300"
                      : issue.severity === "Medium"
                        ? "text-amber-100"
                        : "text-white/70"
                  }`}
                >
                  {issue.severity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
