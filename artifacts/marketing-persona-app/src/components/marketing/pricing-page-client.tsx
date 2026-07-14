"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";
import {
  CONTACT_CTA_PRIMARY,
  CONTACT_EMAIL,
  CONTACT_HREF,
  CONTACT_MAILTO,
} from "@/lib/marketing/marketing-contact";

const glassCard = cardSurfaceClass("glass");
const glassCardStatic = cardSurfaceClass("glass", false);

const SAAS_PLANS = [
  {
    name: "Starter",
    price: "Free",
    description: "Try the platform with your own AI key",
    featured: false,
    features: [
      "Unlimited articles with BYOK",
      "1 website project",
      "30-day content calendar",
      "WordPress + 15 CMS destinations",
    ],
    cta: { label: "Start free", href: "/content-autopilot" },
  },
  {
    name: "Growth",
    price: "$49/mo",
    description: "Daily autopilot for SMB teams",
    featured: true,
    features: [
      "Unlimited articles with BYOK",
      "Daily autopilot (draft or live)",
      "3 website projects",
      "Humanization + quality scores",
      "LLM visibility tracking",
    ],
    cta: { label: "Start with your URL", href: "/content-autopilot" },
  },
];

const ENGAGEMENTS = [
  {
    name: "GEO Audit Sprint",
    description: "Baseline assessment of your AI search visibility",
    features: [
      "AI visibility audit across ChatGPT, Perplexity, and Google AI Overviews",
      "Competitor GEO scan",
      "90-day action plan",
      "Executive summary and recommendations",
    ],
  },
  {
    name: "AEO Foundation",
    description: "Strategy and content program for answer-engine visibility",
    featured: true,
    features: [
      "12-month growth roadmap",
      "Monthly content calendar and briefs",
      "GEO and AEO performance reporting",
      "CMS publishing setup and support",
      "Editorial review before every publish",
    ],
  },
  {
    name: "Full GEO Program",
    description: "End-to-end visibility management for scaling teams",
    features: [
      "Everything in AEO Foundation",
      "Ongoing content production and repurposing",
      "Multi-site CMS publishing",
      "Keyword and AI citation tracking",
      "Dedicated strategist and priority support",
    ],
  },
];

export function PricingPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Pricing"
          titleLine1="Self-serve autopilot"
          titleLine2="or full GEO program"
          description="Start free with Content Autopilot, upgrade to Growth for daily publishing, or book a discovery call for strategy-first consulting."
          backgroundImage={HERO_IMAGES.pricing.hero}
          ctas={[
            { label: "Start free", href: "/content-autopilot", variant: "primary" },
            { label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF, variant: "ghost" },
          ]}
        />
      }
    >
      <section className="py-16 bg-black relative z-20 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditorialHeading
              line1="Platform"
              line2="plans"
              description="Self-serve SMB track — same engine as our consulting clients, with editorial control built in."
              theme="dark"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {SAAS_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 flex flex-col ${
                  plan.featured
                    ? `${glassCard} ring-2 ring-(--accent-warm) shadow-lg shadow-black/40`
                    : glassCard
                }`}
              >
                {plan.featured && (
                  <span className="text-xs font-semibold uppercase tracking-wide mb-4 text-(--accent-warm)">
                    Most popular
                  </span>
                )}
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <p className={`text-3xl font-bold mt-2 ${plan.featured ? "text-white" : "text-(--accent-warm)"}`}>
                  {plan.price}
                </p>
                <p className="text-sm mt-2 mb-6 text-white/65">{plan.description}</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Check className="h-4 w-4 shrink-0 mt-0.5 text-(--accent-warm)" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.cta.href}
                  className={`block text-center px-6 py-3 rounded-full font-medium transition-all ${
                    plan.featured
                      ? "bg-(--accent-warm) text-white hover:bg-(--accent-warm-hover)"
                      : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {plan.cta.label}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-white/50 mt-8">
            Growth checkout requires Stripe billing to be enabled on your deployment.{" "}
            <Link href="/compare/ai-seo-tools" className="text-white/80 hover:text-white hover:underline">
              Compare vs autopilot SEO tools →
            </Link>
          </p>
        </div>
      </section>

      <section className="py-16 bg-black relative z-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditorialHeading
              line1="Consulting"
              line2="engagements"
              description="For mid-market teams — scoped GEO/AEO programs with a dedicated strategist."
              theme="dark"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {ENGAGEMENTS.map((engagement) => (
              <div
                key={engagement.name}
                className={`rounded-2xl p-8 flex flex-col ${
                  engagement.featured
                    ? `${glassCard} ring-2 ring-(--accent-warm) shadow-lg shadow-black/40`
                    : glassCard
                }`}
              >
                {engagement.featured && (
                  <span className="text-xs font-semibold uppercase tracking-wide mb-4 text-(--accent-warm)">
                    Most common
                  </span>
                )}
                <h2 className="text-xl font-bold text-white">{engagement.name}</h2>
                <p className="text-sm mt-2 mb-6 text-white/65">{engagement.description}</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {engagement.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Check className="h-4 w-4 shrink-0 mt-0.5 text-(--accent-warm)" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={CONTACT_HREF}
                  className={`block text-center px-6 py-3 rounded-full font-medium transition-all ${
                    engagement.featured
                      ? "bg-(--accent-warm) text-white hover:bg-(--accent-warm-hover)"
                      : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Contact us to scope
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-white/50 mt-10">
            Questions?{" "}
            <Link href={CONTACT_HREF} className="text-white/80 hover:text-white hover:underline">
              Book a discovery call
            </Link>{" "}
            — we scope every program to your CMS, market, and goals.
          </p>

          <div className={`mt-16 ${glassCardStatic} p-8`}>
            <h2 className="text-lg font-semibold mb-6 text-white">Typical engagement timeline</h2>
            <ol className="space-y-4 text-sm text-white/65">
              <li><strong className="text-white">Week 1 — Discovery & setup:</strong> Brand scan, CMS + GSC/GA4 connections, 12-month roadmap review.</li>
              <li><strong className="text-white">Weeks 2–4 — Foundation:</strong> 30-day calendar, first pillar draft, GEO remediation on priority pages.</li>
              <li><strong className="text-white">Month 2+ — Production:</strong> Weekly drafts with editorial review, publish to your CMS, monthly performance reporting.</li>
            </ol>
          </div>
          <p className="text-center text-sm text-white/50 mt-6">
            Or{" "}
            <a href={CONTACT_MAILTO} className="text-white/80 hover:text-white hover:underline">
              email {CONTACT_EMAIL}
            </a>
          </p>

          <div className={`mt-16 ${glassCardStatic} p-8 overflow-x-auto`}>
            <h3 className="text-lg font-bold mb-6 text-center text-white">Why productized consulting?</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 pr-4 font-medium text-white/50">Capability</th>
                  <th className="py-3 px-4 font-medium text-white">goals.ac</th>
                  <th className="py-3 pl-4 font-medium text-white/50">Typical agency or AI tool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  ["12-month strategy roadmaps", "✓ Built in", "Custom SOW, weeks to start"],
                  ["Editorial review before publish", "✓ Always", "Varies"],
                  ["AI visibility (GEO/AEO) tracking", "✓", "Often separate vendor"],
                  ["CMS integrations (8+)", "✓", "Manual or limited"],
                  ["Dedicated strategist", "✓ On retainer", "Rotating account manager"],
                ].map(([cap, us, them]) => (
                  <tr key={cap} className="even:bg-white/5">
                    <td className="py-3 pr-4 text-white/80">{cap}</td>
                    <td className="py-3 px-4 font-medium text-(--accent-warm)">{us}</td>
                    <td className="py-3 pl-4 text-white/50">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
        items={[
          {
            question: "How do I get access?",
            answer:
              "Start free at /content-autopilot with your website URL, or book a discovery call for a scoped GEO/AEO consulting program.",
          },
          {
            question: "Is the roadmap generator free to browse?",
            answer:
              "Yes. Our public roadmap catalog is free with no signup. Custom roadmap generation is part of client engagements.",
          },
          {
            question: "Which platforms can you publish to?",
            answer:
              "WordPress, Shopify, Notion, Webflow, Ghost, webhooks, plus LinkedIn, X, Facebook, Instagram, Bluesky, and Mastodon.",
            helpHref: "/help/publish-social-content",
          },
        ]}
      />

      <MarketingCTA
        titleLine1="Ready to improve"
        titleLine2="your AI visibility?"
        description="Book a 30-minute discovery call — we'll scope what fits."
        primaryLabel={CONTACT_CTA_PRIMARY}
        variant="dark"
        backgroundImage={HERO_IMAGES.pricing.footer}
        secondaryHref={CONTACT_MAILTO}
        secondaryLabel={`Email ${CONTACT_EMAIL} →`}
      />
    </MarketingPageShell>
  );
}
