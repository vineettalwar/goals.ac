"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { FAQAccordion } from "@/components/marketing/sections/faq-accordion";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

const glassCard = cardSurfaceClass("glass", false);

const ROWS = [
  { feature: "Research-backed SEO briefs", goals: true, autopilot: false },
  { feature: "Editorial review before publish", goals: true, autopilot: "partial" as const },
  { feature: "Inspectable article quality scores", goals: true, autopilot: "partial" as const },
  { feature: "AI visibility (ChatGPT, Perplexity…)", goals: true, autopilot: true },
  { feature: "GEO technical audit + weekly re-audit", goals: true, autopilot: "partial" as const },
  { feature: "CMS publish (WordPress, Ghost, Shopify + Basic publish)", goals: true, autopilot: true },
  { feature: "30-day content calendar", goals: true, autopilot: true },
  { feature: "Managed GEO/AEO program", goals: true, autopilot: false },
  { feature: "Consulting-led GEO program", goals: true, autopilot: false },
  { feature: "Self-serve Growth plan ($49/mo in-app when Stripe is configured)", goals: true, autopilot: true },
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
          description="How a research-driven content studio compares to typical autopilot SEO tools on editorial control, cross-platform publishing, and link building."
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
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
          Typical autopilot tools sell self-serve subscriptions with daily articles and backlink exchanges. goals.ac is a content studio: research-backed drafts, editorial review, and cross-platform publishing.
          {" "}
          <Link href="/link-building" className="text-white/80 hover:text-white hover:underline">Learn our white-hat link approach →</Link>
        </p>
      </MarketingSection>

      <MarketingSection bordered className="py-16" titleLine1="What you can" titleLine2="demo today">
        <ul className={`${glassCard} max-w-2xl mx-auto space-y-3 p-6 text-sm text-white/80 list-none`}>
          <li>
            <Link href="/article-quality" className="text-white hover:underline">
              Humanize before/after
            </Link>
            {" "}
            — raw draft vs rewritten pass with human-voice and quality scores.
          </li>
          <li>Live draft score in Studio — editorial + SERP delta updates as you edit.</li>
          <li>WordPress, Ghost, Shopify (deep), plus Basic publish for headless/site builders — with health checks on connection tiles.</li>
          <li>Queue social — one click from an approved article into the social composer queue.</li>
        </ul>
      </MarketingSection>

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
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
            answer:
              "Start free on Starter. Self-serve Growth is in Settings → Billing after signup — Growth is $49/mo when Stripe is configured. Hands-on GEO/AEO programs are scoped on /pricing — book a call for custom work.",
          },
          {
            question: "How do you compare on AI visibility?",
            answer: "We track citations in ChatGPT, Perplexity, Claude, and Gemini on a schedule, plus weekly GEO re-audits, in one dashboard.",
          },
        ]}
      />

      <MarketingCTA
        titleLine1="Try the"
        titleLine2="content studio"
        description="Sign up free, connect your CMS, and create your first research-backed draft."
        variant="dark"
        secondaryHref="/free-tools"
        secondaryLabel="Free SEO tools →"
      />
    </MarketingPageShell>
  );
}
