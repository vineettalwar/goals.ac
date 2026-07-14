"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { EditorialHeading } from "@/components/marketing/sections/editorial-heading";
import { FAQAccordion } from "@/components/marketing/sections/faq-accordion";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { publicApiUrl } from "@/lib/marketing/site/public-api";
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
import {
  DEFAULT_PLAN_QUOTA_LIMITS,
  PLAN_DISPLAY_CREDITS,
  PLAN_DISPLAY_PRICES,
  PLAN_LABELS,
  type PlanId,
} from "@/lib/billing/plans";
import type { PublicPlanCatalog } from "@workspace/billing/public-plans";

const glassCard = cardSurfaceClass("glass");
const glassCardStatic = cardSurfaceClass("glass", false);

type SaasPlanId = Extract<PlanId, "starter" | "growth" | "scale">;

const SAAS_PLANS: Array<{
  id: SaasPlanId;
  description: string;
  features: string[];
  featured?: boolean;
  ctaLabel: string;
  ctaHref: string;
}> = [
  {
    id: "starter",
    description: "Self-serve content studio for one site",
    features: [
      "1 site, 3 roadmaps/mo",
      "5 articles/mo on platform key",
      "CMS + social publishing",
      "Bring your own AI keys anytime",
    ],
    ctaLabel: PRODUCT_CTA_PRIMARY,
    ctaHref: PRODUCT_CTA_HREF,
  },
  {
    id: "growth",
    description: "More sites, higher limits, and included AI credits",
    featured: true,
    features: [
      "3 sites, 12 roadmaps/mo",
      "30 articles/mo on platform key",
      "500 AI credits/mo included",
      "Upgrade anytime in Settings → Billing",
    ],
    ctaLabel: "Start free, upgrade in app",
    ctaHref: PRODUCT_CTA_HREF,
  },
  {
    id: "scale",
    description: "Unlimited scale for agencies and larger teams",
    features: [
      "Unlimited sites and roadmaps",
      "Custom credit packages",
      "Priority support and SSO options",
      "Sales-assisted onboarding",
    ],
    ctaLabel: CONTACT_CTA_LABEL,
    ctaHref: CONTACT_HREF,
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

function formatQuota(value: number | null, unit: string): string {
  if (value === null) return `Unlimited ${unit}`;
  return `${value} ${unit}`;
}

function SaasPlanCard({
  plan,
  catalog,
}: {
  plan: (typeof SAAS_PLANS)[number];
  catalog: PublicPlanCatalog | null;
}) {
  const entry = catalog?.plans.find((row) => row.id === plan.id);
  const quotas = entry?.quotas ?? DEFAULT_PLAN_QUOTA_LIMITS[plan.id];
  const price = entry?.price ?? PLAN_DISPLAY_PRICES[plan.id] ?? "Custom";
  const credits = entry?.credits ?? PLAN_DISPLAY_CREDITS[plan.id];

  return (
    <div
      className={`rounded-2xl p-8 flex flex-col h-full ${
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
      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{PLAN_LABELS[plan.id]}</p>
      <p className="text-3xl font-bold text-white mt-2">{price}</p>
      <p className="text-sm mt-2 mb-4 text-white/65">{plan.description}</p>
      {plan.id !== "scale" && (
        <p className="text-xs text-white/45 mb-4">
          {formatQuota(quotas.sites, "site")}
          {quotas.sites === 1 ? "" : "s"}
          {" · "}
          {formatQuota(quotas.roadmaps, "roadmap/mo")}
          {quotas.articles != null && ` · ${formatQuota(quotas.articles, "article/mo")}`}
          {credits != null && ` · ${credits} AI credits/mo`}
        </p>
      )}
      <ul className="space-y-3 flex-1 mb-8">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
            <Check className="h-4 w-4 shrink-0 mt-0.5 text-(--accent-warm)" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={plan.ctaHref}
        className={`block text-center px-6 py-3 rounded-full font-medium transition-all ${
          plan.featured
            ? "bg-(--accent-warm) text-(--accent-warm-foreground) hover:bg-(--accent-warm-hover)"
            : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {plan.ctaLabel}
      </Link>
    </div>
  );
}

export function PricingPageClient() {
  const [catalog, setCatalog] = useState<PublicPlanCatalog | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(publicApiUrl("/api/plans"))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicPlanCatalog | null) => {
        if (!cancelled && data?.plans?.length) setCatalog(data);
      })
      .catch(() => {
        // Fall back to bundled defaults when the public API is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const growthPrice = useMemo(() => {
    const growth = catalog?.plans.find((plan) => plan.id === "growth");
    return growth?.price ?? PLAN_DISPLAY_PRICES.growth ?? "$49/mo";
  }, [catalog]);

  const selfServeDescription = `Sign up free on Starter. Upgrade to Growth (${growthPrice}) in Settings → Billing when you need more sites and included AI credits.`;

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Plans"
          titleLine1="Start free"
          titleLine2="scale when ready"
          description="Use the content studio on your own, upgrade to Growth when you need more, or add a hands-on program for research, production, and cross-platform publishing."
          backgroundImage={HERO_IMAGES.pricing.hero}
          persistCtas
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: PRODUCT_CTA_SECONDARY, href: PRODUCT_CTA_SECONDARY_HREF, variant: "ghost" },
          ]}
        />
      }
    >
      <section className="py-16 bg-black relative z-20 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditorialHeading
              line1="Self-serve"
              line2="plans"
              description={selfServeDescription}
              theme="dark"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {SAAS_PLANS.map((plan) => (
              <SaasPlanCard key={plan.id} plan={plan} catalog={catalog} />
            ))}
          </div>
          <p className="text-center text-sm text-white/50 mt-8">
            All plans support BYOK for AI providers.{" "}
            <Link href="/settings" className="text-white/80 hover:text-white hover:underline">
              Manage billing in Settings
            </Link>{" "}
            after signup.
          </p>
        </div>
      </section>

      <section className="py-16 bg-black relative z-20">
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
                  ["CMS + social destinations (16+)", "Included", "Manual or limited"],
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
              "Yes. Sign up free on Starter, connect your destinations, and create content on your own. Upgrade to Growth in Settings → Billing, or add a hands-on program if you want our team involved.",
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
              "WordPress, Shopify, Drupal, Joomla, Notion, Webflow, Ghost, webhooks, plus LinkedIn, X, Facebook, Instagram, Bluesky, and Mastodon.",
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
