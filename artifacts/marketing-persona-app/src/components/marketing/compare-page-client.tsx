"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

const ROWS = [
  { feature: "12-month growth roadmaps", goals: true, autopilot: false },
  { feature: "Editorial review before publish", goals: true, autopilot: "partial" as const },
  { feature: "AI visibility (ChatGPT, Perplexity…)", goals: true, autopilot: true },
  { feature: "GEO technical audit", goals: true, autopilot: true },
  { feature: "CMS auto-publish", goals: true, autopilot: true },
  { feature: "30-day content calendar", goals: true, autopilot: true },
  { feature: "Backlink exchange network", goals: false, autopilot: true },
  { feature: "Internal link hub (white-hat)", goals: true, autopilot: false },
  { feature: "Reddit auto-posting", goals: false, autopilot: "partial" as const },
  { feature: "18 content formats", goals: true, autopilot: false },
  { feature: "BYOK (bring your own AI key)", goals: true, autopilot: false },
  { feature: "Starting price", goals: "$0 / $49", autopilot: "$99+" },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-5 w-5 text-emerald-600 mx-auto" />;
  if (value === false) return <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
  if (value === "partial") return <span className="text-xs text-muted-foreground">Limited</span>;
  return <span className="text-sm font-medium">{value}</span>;
}

export function ComparePageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Comparison"
          titleLine1="goals.ac vs"
          titleLine2="AI SEO autopilot tools"
          description="Honest comparison on strategy depth, editorial control, link building approach, and price."
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[
            { label: "Start free", href: "/signup", variant: "primary" },
            { label: "See pricing", href: "/pricing", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection variant="paper" bordered className="py-20 bg-background" titleLine1="Feature" titleLine2="comparison">
        <div className="paper-card rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">Capability</th>
                <th className="py-4 px-4 font-bold text-center">goals.ac</th>
                <th className="py-4 px-4 font-medium text-center text-muted-foreground">Typical autopilot SEO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROWS.map((row) => (
                <tr key={row.feature}>
                  <td className="py-3 px-4">{row.feature}</td>
                  <td className="py-3 px-4 text-center"><Cell value={row.goals} /></td>
                  <td className="py-3 px-4 text-center"><Cell value={row.autopilot} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-6 text-center max-w-2xl mx-auto">
          We don&apos;t name competitors directly. This reflects common autopilot SEO and AI content tools.
          {" "}
          <Link href="/link-building" className="text-primary hover:underline">Learn our white-hat link approach →</Link>
        </p>
      </MarketingSection>

      <FAQAccordion
        titleLine1="Why teams"
        titleLine2="choose goals.ac"
        items={[
          { question: "Why not use a backlink exchange?", answer: "Link exchanges risk Google penalties and don't build real topical authority. We focus on content clusters and internal linking." },
          { question: "Is goals.ac fully automated?", answer: "Autopilot is optional. You can review every draft, use manual publish mode, and inspect quality scores before going live." },
          { question: "What about price?", answer: "Growth is $49/mo vs $99+ for comparable autopilot tools, with strategy roadmaps included free." },
        ]}
      />

      <MarketingCTA
        titleLine1="Try the"
        titleLine2="strategy-first approach"
        description="Start free. Build a roadmap, run a GEO audit, and generate your first draft."
        variant="dark"
        backgroundImage={HERO_IMAGES.features.footer}
        secondaryHref="/free-tools"
        secondaryLabel="Free SEO tools →"
      />
    </MarketingPageShell>
  );
}
