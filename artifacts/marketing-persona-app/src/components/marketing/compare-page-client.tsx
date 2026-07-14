"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";

const glassCard = cardSurfaceClass("glass", false);

const ROWS = [
  { feature: "12-month growth roadmaps", goals: true, autopilot: false },
  { feature: "Editorial review before publish", goals: true, autopilot: "partial" as const },
  { feature: "Inspectable article quality scores", goals: true, autopilot: "partial" as const },
  { feature: "AI visibility (ChatGPT, Perplexity…)", goals: true, autopilot: true },
  { feature: "GEO technical audit + weekly re-audit", goals: true, autopilot: "partial" as const },
  { feature: "CMS auto-publish (16+ destinations)", goals: true, autopilot: true },
  { feature: "30-day content calendar", goals: true, autopilot: true },
  { feature: "Managed GEO/AEO program", goals: true, autopilot: false },
  { feature: "Self-serve $49–99/mo pricing", goals: false, autopilot: true },
  { feature: "Backlink exchange network", goals: false, autopilot: true },
  { feature: "Internal link hub (white-hat)", goals: true, autopilot: false },
  { feature: "Humanization pipeline", goals: true, autopilot: false },
  { feature: "BYOK cost transparency", goals: true, autopilot: false },
  { feature: "18 content formats + repurposing", goals: true, autopilot: false },
  { feature: "Dedicated strategist", goals: true, autopilot: false },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-5 w-5 text-emerald-400 mx-auto" />;
  if (value === false) return <X className="h-5 w-5 text-white/25 mx-auto" />;
  if (value === "partial") return <span className="text-xs text-white/50">Limited</span>;
  return <span className="text-sm font-medium text-white/80">{value}</span>;
}

export function ComparePageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Comparison"
          titleLine1="goals.ac vs"
          titleLine2="AI SEO autopilot tools"
          description="Honest comparison on strategy depth, editorial control, and link building — without naming competitors directly."
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[
            { label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF, variant: "primary" },
            { label: "Article quality demo", href: "/article-quality", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection bordered className="py-20" titleLine1="Feature" titleLine2="comparison">
        <div className={`${glassCard} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-white/50">Capability</th>
                <th className="py-4 px-4 font-bold text-center text-white">goals.ac</th>
                <th className="py-4 px-4 font-medium text-center text-white/50">Typical autopilot SEO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {ROWS.map((row) => (
                <tr key={row.feature} className="even:bg-white/5">
                  <td className="py-3 px-4 text-white/80">{row.feature}</td>
                  <td className="py-3 px-4 text-center"><Cell value={row.goals} /></td>
                  <td className="py-3 px-4 text-center"><Cell value={row.autopilot} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-white/50 mt-6 text-center max-w-2xl mx-auto">
          Typical autopilot tools include self-serve products in the $49–99/mo range with daily articles and backlink exchanges.
          {" "}
          <Link href="/link-building" className="text-white/80 hover:text-white hover:underline">Learn our white-hat link approach →</Link>
        </p>
      </MarketingSection>

      <FAQAccordion
        titleLine1="Why teams"
        titleLine2="choose goals.ac"
        items={[
          {
            question: "Why not use a backlink exchange?",
            answer: "Link exchanges risk Google penalties and don't build real topical authority. We focus on content clusters, internal linking, and citation-worthy depth instead of PBN-style networks.",
          },
          {
            question: "Is goals.ac fully automated?",
            answer: "Autopilot is optional. You can review every draft, use manual publish mode, and inspect quality scores before going live. We sell a managed GEO/AEO program, not a black box.",
          },
          {
            question: "How is goals.ac priced?",
            answer: "We work with partners and mid-market teams through scoped consulting engagements — no public self-serve checkout. Try our free GEO audit and article quality demo, then book a discovery call.",
          },
          {
            question: "How do you compare on AI visibility?",
            answer: "We track brand citations across ChatGPT, Perplexity, Claude, and Gemini with scheduled snapshots, plus weekly GEO re-audits — in one autopilot activity dashboard.",
          },
        ]}
      />

      <MarketingCTA
        titleLine1="Try the"
        titleLine2="strategy-first approach"
        description="Book a discovery call. We'll scope a strategy-first SEO, AEO, and GEO program for your team."
        variant="dark"
        backgroundImage={HERO_IMAGES.features.footer}
        secondaryHref="/free-tools"
        secondaryLabel="Free SEO tools →"
      />
    </MarketingPageShell>
  );
}
