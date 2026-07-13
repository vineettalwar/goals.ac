"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

const PLANS = [
  {
    name: "Starter",
    price: "TBD",
    period: "",
    description: "Perfect for exploring goals.ac",
    features: [
      "Growth roadmaps",
      "Website projects",
      "Content pieces",
      "GEO audit (basic)",
      "Community support",
    ],
    cta: "Join waitlist",
    href: "/signup",
    featured: false,
  },
  {
    name: "Growth",
    price: "TBD",
    period: "",
    description: "For startups serious about content",
    features: [
      "Unlimited roadmaps",
      "Multiple website projects",
      "Content Studio",
      "Marketing personas",
      "WordPress auto-publish",
      "Full GEO audit",
      "AI visibility tracking",
      "Competitor analysis",
      "Content Autopilot",
      "Priority support",
    ],
    cta: "Contact us",
    href: "/contact",
    featured: true,
  },
  {
    name: "Scale",
    price: "TBD",
    period: "",
    description: "For teams and agencies",
    features: [
      "Everything in Growth",
      "Unlimited projects",
      "Multi-site publishing",
      "Org roles & team access",
      "Keyword tracking",
      "Admin dashboard",
      "Dedicated support",
    ],
    cta: "Contact us",
    href: "/contact",
    featured: false,
  },
];

export function PricingPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Pricing"
          titleLine1="Plans that scale"
          titleLine2="with your pipeline"
          description="Pricing is being finalized. Join early access or talk to us about your team."
          backgroundImage={HERO_IMAGES.pricing.hero}
          ctas={[
            { label: "Start free", href: "/signup", variant: "primary" },
            { label: "Contact us", href: "/contact", variant: "ghost" },
          ]}
        />
      }
    >
      <section className="py-16 bg-background relative z-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditorialHeading
              line1="Pricing"
              line2="coming soon"
              description="We're finalizing plans. Feature tiers below show what we're building. Exact pricing TBD."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 flex flex-col paper-card-hover ${
                  plan.featured
                    ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-(--accent-warm) ring-offset-2 ring-offset-background"
                    : "paper-card"
                }`}
              >
                {plan.featured && (
                  <span className="text-xs font-semibold uppercase tracking-wide mb-4 opacity-70">
                    Most popular
                  </span>
                )}
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <div className="mt-2 mb-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span
                      className={`text-sm ${plan.featured ? "opacity-70" : "text-muted-foreground"}`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                <p
                  className={`text-sm mb-6 ${plan.featured ? "opacity-80" : "text-muted-foreground"}`}
                >
                  {plan.description}
                </p>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`h-4 w-4 shrink-0 mt-0.5 ${plan.featured ? "opacity-80" : "text-primary"}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`text-center px-6 py-3 rounded-full font-medium transition-all ${
                    plan.featured
                      ? "bg-(--accent-warm) text-white hover:bg-(--accent-warm-hover)"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-10">
            Pricing TBD · early access available · no link schemes. Questions?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>
          </p>

          <div className="mt-16 paper-card rounded-2xl p-8 overflow-x-auto">
            <h3 className="text-lg font-bold mb-6 text-center">vs typical AI SEO autopilot tools</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-medium text-muted-foreground">Capability</th>
                  <th className="py-3 px-4 font-medium">goals.ac</th>
                  <th className="py-3 pl-4 font-medium text-muted-foreground">Typical autopilot SEO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["12-month strategy roadmaps", "✓", "✗"],
                  ["Editorial review before publish", "✓ Always", "Limited"],
                  ["AI visibility tracking", "✓", "✓"],
                  ["Backlink exchange network", "✗ White-hat only", "✓"],
                  ["CMS integrations (8+)", "✓", "4–5"],
                  ["Pricing", "TBD", "$99+/mo"],
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
        titleLine1="Pricing"
        titleLine2="questions"
        items={[
          {
            question: "When will pricing be available?",
            answer:
              "We're finalizing tiers and billing. Join the waitlist or contact us for early access. We'll notify you before paid plans launch.",
          },
          {
            question: "Is the roadmap generator free?",
            answer:
              "Browsing our public roadmap catalog is free with no signup. Signed-in users can generate custom roadmaps during early access.",
          },
          {
            question: "Which platforms can I publish to?",
            answer:
              "WordPress, Shopify, Notion, Webflow, Ghost, webhooks, plus LinkedIn, X, Facebook, Instagram, Bluesky, and Mastodon.",
            helpHref: "/help/publish-social-content",
          },
        ]}
      />

      <MarketingCTA
        titleLine1="Start with a"
        titleLine2="free roadmap"
        description="No credit card required. Generate your 12-month growth plan in minutes."
        primaryLabel="Create free account"
        variant="dark"
        backgroundImage={HERO_IMAGES.pricing.footer}
        secondaryHref="/contact"
        secondaryLabel="Contact us about pricing →"
      />
    </MarketingPageShell>
  );
}
