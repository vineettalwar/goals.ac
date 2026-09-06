"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { EditorialHeading } from "@/components/marketing/sections/editorial-heading";
import { FAQAccordion } from "@/components/marketing/sections/faq-accordion";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import {
  CONTACT_CTA_LABEL,
  CONTACT_EMAIL,
  CONTACT_HREF,
  CONTACT_MAILTO,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
  PRODUCT_CTA_SECONDARY,
  PRODUCT_CTA_SECONDARY_HREF,
} from "@/lib/marketing/site/marketing-contact";

const glassCard = cardSurfaceClass("glass");
const glassCardStatic = cardSurfaceClass("glass", false);

const SAAS_PLANS = [
  {
    name: "Growth",
    price: "$49/mo",
    description: "Self-serve studio for founders and small teams",
    features: [
      "30 articles / month",
      "12 roadmaps",
      "3 connected sites",
      "500 platform AI credits / month",
      "WordPress, Ghost, Shopify, and more",
      "GEO & AEO tracking",
    ],
    cta: { label: "Start free trial", href: "/signup" },
  },
  {
    name: "Scale",
    price: "€500/mo",
    description: "High-volume content operations for scaling B2B teams",
    featured: true,
    features: [
      "Unlimited articles & roadmaps",
      "Unlimited connected sites",
      "5,000 platform AI credits / month",
      "Priority content queue",
      "Multi-site CMS publishing",
      "Dedicated support",
    ],
    cta: { label: "Get started", href: "/signup?plan=scale" },
    note: "VAT auto-calculated at checkout. Tax ID collection for B2B reverse charge.",
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
      "30-day content calendar and SEO briefs",
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
          badge="Plans"
          titleLine1="Hands-on"
          titleLine2="content programs"
          description="Scoped GEO/AEO programs for research, production, editorial review, and cross-platform publishing."
          backgroundImage={HERO_IMAGES.pricing.hero}
          persistCtas
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: PRODUCT_CTA_SECONDARY, href: PRODUCT_CTA_SECONDARY_HREF, variant: "ghost" },
          ]}
        />
      }
    >
      {/* ── Self-serve SaaS plans ─────────────────────────────── */}
      <section className="py-16 bg-black relative z-20 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditorialHeading
              line1="Self-serve"
              line2="platform"
              description="Pick a plan, connect your CMS, and start publishing — no sales call required."
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
                <p className="text-3xl font-bold text-white mt-2">
                  {plan.price}
                  <span className="text-sm font-normal text-white/50 ml-1">billed monthly</span>
                </p>
                <p className="text-sm mt-2 mb-6 text-white/65">{plan.description}</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Check className="h-4 w-4 shrink-0 mt-0.5 text-(--accent-warm)" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.cta.href}
                  className={`block text-center px-6 py-3 rounded-full font-medium transition-all ${
                    plan.featured
                      ? "bg-(--accent-warm) text-(--accent-warm-foreground) hover:bg-(--accent-warm-hover)"
                      : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {plan.cta.label}
                </Link>
                {plan.note && (
                  <p className="text-xs text-white/40 mt-4 text-center">{plan.note}</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-white/50 mt-10">
            Need custom volume or a dedicated strategist?{" "}
            <Link href={CONTACT_HREF} className="text-white/80 hover:text-white hover:underline">
              {CONTACT_CTA_LABEL}
            </Link>
          </p>
        </div>
      </section>

      {/* ── Hands-on content programs ─────────────────────────── */}
      <section className="py-16 bg-black relative z-20 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditorialHeading
              line1="Hands-on"
              line2="programs"
              description="Optional scoped programs if you want us running the studio with you."
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
                    Recommended starting point
                  </span>
                )}
                <h2 className="text-xl font-bold text-white">{engagement.name}</h2>
                <p className="text-sm mt-2 mb-6 text-white/65">{engagement.description}</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {engagement.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Check className="h-4 w-4 shrink-0 mt-0.5 text-(--accent-warm)" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={CONTACT_HREF}
                  className={`block text-center px-6 py-3 rounded-full font-medium transition-all ${
                    engagement.featured
                      ? "bg-(--accent-warm) text-(--accent-warm-foreground) hover:bg-(--accent-warm-hover)"
                      : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {CONTACT_CTA_LABEL}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-white/50 mt-10">
            Need a custom scope?{" "}
            <Link href={CONTACT_HREF} className="text-white/80 hover:text-white hover:underline">
              {CONTACT_CTA_LABEL}
            </Link>{" "}
            and we&apos;ll figure out what fits.
          </p>

          <div className={`mt-16 ${glassCardStatic} p-8`}>
            <h2 className="text-lg font-semibold mb-6 text-white">Typical program timeline</h2>
            <ol className="space-y-4 text-sm text-white/65">
              <li><strong className="text-white">Week 1 (Setup):</strong> Brand scan, CMS + GSC/GA4 connections, keyword and competitor review.</li>
              <li><strong className="text-white">Weeks 2–4 (Foundation):</strong> 30-day calendar, first pillar draft, GEO fixes on priority pages.</li>
              <li><strong className="text-white">Month 2+ (Production):</strong> Weekly drafts with editorial review, publish to your CMS, monthly reporting.</li>
            </ol>
          </div>
          <p className="text-center text-sm text-white/50 mt-6">
            Or{" "}
            <a href={CONTACT_MAILTO} className="text-white/80 hover:text-white hover:underline">
              email {CONTACT_EMAIL}
            </a>
          </p>

          <div className={`mt-16 ${glassCardStatic} p-8 overflow-x-auto`}>
            <h3 className="text-lg font-bold mb-6 text-center text-white">Why productized content programs?</h3>
            <table className="w-full text-sm">
              <caption className="sr-only">
                Comparison of goals.ac capabilities versus typical agencies or AI tools
              </caption>
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th scope="col" className="py-3 pr-4 font-medium text-white/50">Capability</th>
                  <th scope="col" className="py-3 px-4 font-medium text-white">goals.ac</th>
                  <th scope="col" className="py-3 pl-4 font-medium text-white/50">Typical agency or AI tool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  ["Research-backed SEO briefs", "Built in", "Custom SOW, weeks to start"],
                  ["Editorial review before publish", "Always", "Varies"],
                  ["AI visibility (GEO/AEO) tracking", "Included", "Often separate vendor"],
                  ["CMS + social (deep stacks + Basic publish)", "Included", "Manual or limited"],
                  ["Dedicated strategist", "On retainer programs", "Rotating account manager"],
                ].map(([cap, us, them]) => (
                  <tr key={cap} className="even:bg-white/5">
                    <td className="py-3 pr-4 text-white/80">{cap}</td>
                    <td className="py-3 px-4 font-medium text-(--accent-warm)">
                      <span className="sr-only">Yes: </span>
                      {us}
                    </td>
                    <td className="py-3 pl-4 text-white/50">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-white/50 mt-6">
            <Link href="/compare/ai-seo-tools" className="text-white/80 hover:text-white hover:underline">
              Compare vs autopilot SEO tools →
            </Link>
          </p>
        </div>
      </section>

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
        items={[
          {
            question: "Can I use the studio without a program?",
            answer:
              "Yes. Sign up free, connect WordPress/Ghost/Shopify or another destination, and create content on your own. Self-serve Growth is in Settings → Billing. Add a hands-on program when you want our team involved in research, production, and publishing.",
          },
          {
            question: "What can I try before signing up?",
            answer: (
              <>
                Try the{" "}
                <Link href="/geo-audit" className="text-white/80 hover:text-white hover:underline">
                  free GEO audit
                </Link>
                ,{" "}
                <Link href="/article-quality" className="text-white/80 hover:text-white hover:underline">
                  article quality demo
                </Link>
                , and{" "}
                <Link href="/free-tools" className="text-white/80 hover:text-white hover:underline">
                  free SEO tools
                </Link>
                . No credit card required.
              </>
            ),
          },
          {
            question: "Which platforms can you publish to?",
            answer:
              "Deep paths for WordPress, Ghost, and Shopify, plus Drupal, Joomla, Notion, Webflow, webhooks, and social (LinkedIn, X, Meta, Bluesky, Mastodon). Headless and site builders support Basic publish — create wrappers, not full plugin depth.",
            helpHref: "/help/publish-social-content",
          },
        ]}
      />

      <MarketingCTA
        titleLine1="Ready to create"
        titleLine2="your first draft?"
        description="Sign up free and connect your CMS in minutes."
        secondaryHref={CONTACT_HREF}
        secondaryLabel={`${CONTACT_CTA_LABEL} →`}
        variant="dark"
      />
    </MarketingPageShell>
  );
}
