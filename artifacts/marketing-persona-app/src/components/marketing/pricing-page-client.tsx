"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import {
  CONTACT_CTA_PRIMARY,
  CONTACT_EMAIL,
  CONTACT_HREF,
  CONTACT_MAILTO,
} from "@/lib/marketing/marketing-contact";

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
          badge="Engagements"
          titleLine1="SEO, AEO & GEO consulting"
          titleLine2="for B2B teams"
          description="Scoped consulting engagements — from baseline audits to full visibility programs. We run strategy; goals.ac runs delivery."
          backgroundImage={HERO_IMAGES.pricing.hero}
          ctas={[
            { label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF, variant: "primary" },
            { label: "See how we work", href: "/features", variant: "ghost" },
          ]}
        />
      }
    >
      <section className="py-16 bg-background relative z-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditorialHeading
              line1="How we"
              line2="work with clients"
              description="Every engagement is scoped to your market, CMS, and goals. Pricing is discussed on a discovery call — no one-size-fits-all tiers."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {ENGAGEMENTS.map((engagement) => (
              <div
                key={engagement.name}
                className={`rounded-2xl p-8 flex flex-col paper-card-hover ${
                  engagement.featured
                    ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-(--accent-warm) ring-offset-2 ring-offset-background"
                    : "paper-card"
                }`}
              >
                {engagement.featured && (
                  <span className="text-xs font-semibold uppercase tracking-wide mb-4 opacity-70">
                    Most common
                  </span>
                )}
                <h2 className="text-xl font-bold">{engagement.name}</h2>
                <p
                  className={`text-sm mt-2 mb-6 ${engagement.featured ? "opacity-80" : "text-muted-foreground"}`}
                >
                  {engagement.description}
                </p>
                <ul className="space-y-3 flex-1 mb-8">
                  {engagement.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`h-4 w-4 shrink-0 mt-0.5 ${engagement.featured ? "opacity-80" : "text-primary"}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={CONTACT_HREF}
                  className={`block text-center px-6 py-3 rounded-full font-medium transition-all ${
                    engagement.featured
                      ? "bg-(--accent-warm) text-white hover:bg-(--accent-warm-hover)"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  Contact us to scope
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-10">
            Questions?{" "}
            <Link href={CONTACT_HREF} className="text-primary hover:underline">
              Book a discovery call
            </Link>
            {" "}or{" "}
            <a href={CONTACT_MAILTO} className="text-primary hover:underline">
              email {CONTACT_EMAIL}
            </a>
          </p>

          <div className="mt-16 paper-card rounded-2xl p-8 overflow-x-auto">
            <h3 className="text-lg font-bold mb-6 text-center">Why productized consulting?</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-medium text-muted-foreground">Capability</th>
                  <th className="py-3 px-4 font-medium">goals.ac</th>
                  <th className="py-3 pl-4 font-medium text-muted-foreground">Typical agency or AI tool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["12-month strategy roadmaps", "✓ Built in", "Custom SOW, weeks to start"],
                  ["Editorial review before publish", "✓ Always", "Varies"],
                  ["AI visibility (GEO/AEO) tracking", "✓", "Often separate vendor"],
                  ["CMS integrations (8+)", "✓", "Manual or limited"],
                  ["Dedicated strategist", "✓ On retainer", "Rotating account manager"],
                ].map(([cap, us, them]) => (
                  <tr key={cap}>
                    <td className="py-3 pr-4">{cap}</td>
                    <td className="py-3 px-4 font-medium text-primary">{us}</td>
                    <td className="py-3 pl-4 text-muted-foreground">{them}</td>
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
              "Book a discovery call. We'll scope your market, CMS, and goals, then send a proposal. Accepted clients receive a platform invite.",
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
