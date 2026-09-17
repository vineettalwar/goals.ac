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
    description: "Self-serve desk for founders and small teams",
    features: [
      "SEO Chat + Content Studio",
      "30 articles / month",
      "12 roadmaps",
      "3 connected sites",
      "500 platform AI credits / month",
      "WordPress-first publish (Ghost & Shopify deep)",
      "GEO audit + Action Queue",
      "GSC / GA4 when connected",
    ],
    cta: { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF },
  },
  {
    name: "Scale",
    price: "€500/mo",
    description: "High-volume operations for multi-site B2B teams",
    featured: true,
    features: [
      "Everything in Growth",
      "Unlimited articles & roadmaps",
      "Unlimited connected sites",
      "5,000 platform AI credits / month",
      "Priority generation queue",
      "Multi-site CMS publish",
      "Dedicated support",
    ],
    cta: { label: "Get started", href: "/signup?plan=scale" },
    note: "VAT at checkout when applicable. Tax ID for B2B reverse charge.",
  },
];

const ENGAGEMENTS = [
  {
    name: "GEO Audit Sprint",
    description: "Baseline of your AI-search and page readiness",
    features: [
      "Technical GEO scan (schema, meta, llms.txt, citability)",
      "Competitor crawl when pages are reachable",
      "90-day action plan",
      "Executive summary",
    ],
  },
  {
    name: "AEO Foundation",
    description: "Strategy and production on the same desk you can run alone",
    featured: true,
    features: [
      "30-day calendar + SEO briefs",
      "Studio drafts with editorial review before live",
      "WordPress-first CMS setup",
      "GEO / visibility reporting",
    ],
  },
  {
    name: "Full GEO Program",
    description: "Ongoing desk + retainer strategist",
    features: [
      "Everything in AEO Foundation",
      "Ongoing production and social repurpose",
      "Action Queue + keyword / AI citation tracking",
      "Dedicated strategist and priority support",
    ],
  },
];

function PlanCta({
  href,
  label,
  featured,
}: {
  href: string;
  label: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        featured
          ? "hero-cta-primary block text-center"
          : "block rounded-sm border border-white/30 bg-white/10 px-6 py-3 text-center font-medium text-white transition-colors hover:bg-white/20"
      }
    >
      {label}
    </Link>
  );
}

export function PricingPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Plans"
          titleLine1="Self-serve desk."
          titleLine2="Programs when you want hands-on."
          description="Growth and Scale open Chat, Studio, Action Queue, and WordPress-first publish. Scoped GEO programs add our team — including a dedicated strategist on Full GEO."
          backgroundImage={HERO_IMAGES.pricing.hero}
          persistCtas
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: PRODUCT_CTA_SECONDARY, href: PRODUCT_CTA_SECONDARY_HREF, variant: "ghost" },
          ]}
        />
      }
    >
      <section className="relative z-20 border-t border-white/10 bg-black py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12">
            <EditorialHeading
              line1="Self-serve"
              line2="platform"
              description="Request access, connect CMS + GSC, and ship. Billing lives in Settings after you're in. Access is invite-only today."
              theme="dark"
              align="left"
            />
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            {SAAS_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-sm p-8 ${
                  plan.featured ? `${glassCard} ring-2 ring-(--accent-warm)` : glassCard
                }`}
              >
                {plan.featured ? (
                  <span className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-(--accent-warm)">
                    Most popular
                  </span>
                ) : null}
                <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {plan.price}
                  <span className="ml-1 text-sm font-normal text-white/50">billed monthly</span>
                </p>
                <p className="mb-6 mt-2 text-sm text-white/65">{plan.description}</p>
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-warm)" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <PlanCta href={plan.cta.href} label={plan.cta.label} featured={plan.featured} />
                {plan.note ? <p className="mt-4 text-center text-xs text-white/40">{plan.note}</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-white/50">
            Need custom volume or a retainer strategist?{" "}
            <Link href={CONTACT_HREF} className="text-white/80 hover:text-white hover:underline">
              {CONTACT_CTA_LABEL}
            </Link>
          </p>
        </div>
      </section>

      <section className="relative z-20 border-t border-white/10 bg-black py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12">
            <EditorialHeading
              line1="Hands-on"
              line2="programs"
              description="Optional. Same desk tools — we run research, production, and review with you."
              theme="dark"
              align="left"
            />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {ENGAGEMENTS.map((engagement) => (
              <div
                key={engagement.name}
                className={`flex flex-col rounded-sm p-8 ${
                  engagement.featured ? `${glassCard} ring-2 ring-(--accent-warm)` : glassCard
                }`}
              >
                {engagement.featured ? (
                  <span className="mb-4 font-mono text-[11px] uppercase tracking-[0.12em] text-(--accent-warm)">
                    Recommended start
                  </span>
                ) : null}
                <h2 className="text-xl font-semibold text-white">{engagement.name}</h2>
                <p className="mb-6 mt-2 text-sm text-white/65">{engagement.description}</p>
                <ul className="mb-8 flex-1 space-y-3">
                  {engagement.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-warm)" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <PlanCta href={CONTACT_HREF} label={CONTACT_CTA_LABEL} featured={engagement.featured} />
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-white/50">
            Custom scope?{" "}
            <Link href={CONTACT_HREF} className="text-white/80 hover:text-white hover:underline">
              {CONTACT_CTA_LABEL}
            </Link>
          </p>

          <div className={`mt-16 ${glassCardStatic} p-8`}>
            <h2 className="mb-6 text-lg font-semibold text-white">Typical program timeline</h2>
            <ol className="space-y-4 text-sm text-white/65">
              <li>
                <strong className="text-white">Week 1:</strong> Brand scan, WordPress + GSC/GA4, keyword and
                competitor review (crawl fails if the homepage is blocked — we say so).
              </li>
              <li>
                <strong className="text-white">Weeks 2–4:</strong> Calendar, first pillar draft, GEO fixes on
                priority URLs, Action Queue seeded from GSC.
              </li>
              <li>
                <strong className="text-white">Month 2+:</strong> Weekly Studio drafts with approve-before-live,
                CMS publish, monthly search + AI citation reporting.
              </li>
            </ol>
          </div>
          <p className="mt-6 text-center text-sm text-white/50">
            Or{" "}
            <a href={CONTACT_MAILTO} className="text-white/80 hover:text-white hover:underline">
              email {CONTACT_EMAIL}
            </a>
          </p>

          <div className={`mt-16 overflow-x-auto ${glassCardStatic} p-8`}>
            <h3 className="mb-6 text-center text-lg font-semibold text-white">Desk vs agency vs autopilot</h3>
            <table className="w-full text-sm">
              <caption className="sr-only">
                Comparison of goals.ac capabilities versus typical agencies or AI tools
              </caption>
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th scope="col" className="py-3 pr-4 font-medium text-white/50">
                    Capability
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-white">
                    goals.ac
                  </th>
                  <th scope="col" className="py-3 pl-4 font-medium text-white/50">
                    Typical agency or AI tool
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  ["SEO Chat + Studio loop", "Built in", "SOW or volume drafts"],
                  ["Approve before live", "Always", "Varies"],
                  ["Action Queue from GSC", "Included", "Separate SEO stack"],
                  ["WordPress-first CMS", "Deep + Basic elsewhere", "Manual or limited"],
                  ["Dedicated strategist", "Full GEO retainer", "Rotating AM"],
                ].map(([cap, us, them]) => (
                  <tr key={cap} className="even:bg-white/5">
                    <td className="py-3 pr-4 text-white/80">{cap}</td>
                    <td className="px-4 py-3 font-medium text-(--accent-warm)">
                      <span className="sr-only">Yes: </span>
                      {us}
                    </td>
                    <td className="py-3 pl-4 text-white/50">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-center text-sm text-white/50">
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
            question: "Can I use the desk without a program?",
            answer:
              "Yes after invite. Request access, connect WordPress (or Ghost/Shopify), and use Chat or Studio. Self-serve billing is in Settings → Billing. Add a program when you want our team on research, production, and publish.",
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
                . No credit card.
              </>
            ),
          },
          {
            question: "Which platforms can you publish to?",
            answer:
              "Deep: WordPress (plugin, Rank Math, featured image, draft-first), Ghost, Shopify. Basic publish elsewhere. Social Hub after the article: LinkedIn, X, Meta, Bluesky, Mastodon.",
            helpHref: "/help/publish-social-content",
          },
          {
            question: "Is a dedicated strategist included in Growth?",
            answer:
              "No. Strategist support is on the Full GEO Program retainer (and custom scopes). Growth and Scale are self-serve with support channels.",
          },
        ]}
      />

      <MarketingCTA
        titleLine1="Ready to run"
        titleLine2="the desk?"
        description="Request access and connect your CMS. Free GEO audit and article quality demo need no account."
        secondaryHref={CONTACT_HREF}
        secondaryLabel={`${CONTACT_CTA_LABEL} →`}
        variant="dark"
      />
    </MarketingPageShell>
  );
}
