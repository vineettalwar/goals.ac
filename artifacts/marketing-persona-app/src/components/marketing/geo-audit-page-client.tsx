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
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

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
          backgroundImage={HERO_IMAGES.geoAudit}
          ctas={[{ label: "Run audit below", href: "#geo-audit-form", variant: "primary" }]}
        />
      }
    >
      <section id="geo-audit-form" className="py-0 bg-background relative z-20">
        <div className="max-w-xl mx-auto px-6">
          <form onSubmit={handleAudit} className="paper-card rounded-2xl p-8 space-y-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
              No account required
            </div>
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
              <p className="text-xs text-muted-foreground">
                Enter the exact page URL you want to audit
              </p>
            </div>
            <Button type="submit" className="w-full h-12" disabled={loading}>
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
      </section>

      <MarketingSection
        badge="What we check"
        title="Technical signals that affect AI visibility"
        description="Every audit scans the page structure, metadata, and schema that influence retrieval and citation."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {CHECKS.map((check) => (
            <div key={check} className="paper-card paper-card-hover rounded-xl p-4 text-center">
              <p className="font-medium text-sm">{check}</p>
            </div>
          ))}
        </div>
        <div className="paper-card rounded-2xl p-6">
          <p className="text-sm font-semibold mb-4">Sample issues you might see</p>
          <div className="space-y-2">
            {SAMPLE_ISSUES.map((issue) => (
              <div
                key={issue.title}
                className="flex items-center justify-between rounded-lg border border-[--border] px-4 py-3 text-sm"
              >
                <span>{issue.title}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    issue.severity === "High"
                      ? "bg-red-100 text-red-700"
                      : issue.severity === "Medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
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
