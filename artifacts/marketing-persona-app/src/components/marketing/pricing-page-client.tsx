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
    price: "$0",
    period: "forever",
    description: "Perfect for exploring goals.ac",
    features: [
      "3 growth roadmaps/month",
      "1 website project",
      "5 content pieces/month",
      "GEO audit (basic)",
      "Community support",
    ],
    cta: "Start free",
    href: "/signup",
    featured: false,
  },
  {
    name: "Growth",
    price: "$49",
    period: "/month",
    description: "For startups serious about content",
    features: [
      "Unlimited roadmaps",
      "5 website projects",
      "50 content pieces/month",
      "Marketing personas (unlimited)",
      "WordPress auto-publish",
      "Full GEO audit",
      "AI visibility tracking",
      "Competitor analysis",
      "Content Autopilot",
      "Priority support",
    ],
    cta: "Start Growth",
    href: "/signup?plan=growth",
    featured: true,
  },
  {
    name: "Scale",
    price: "$149",
    period: "/month",
    description: "For teams and agencies",
    features: [
      "Everything in Growth",
      "Unlimited projects",
      "Unlimited content",
      "Multi-site WordPress",
      "Competitor analysis (unlimited)",
      "Keyword tracking",
      "Internal Link Hub (Beta)",
      "Reddit Discovery (Beta)",
      "Admin dashboard",
      "Dedicated support",
    ],
    cta: "Start Scale",
    href: "/signup?plan=scale",
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
          description="Simple, transparent pricing. No hidden fees. Cancel any time."
          backgroundImage={HERO_IMAGES.pricing.hero}
          ctas={[{ label: "Start free", href: "/signup", variant: "primary" }]}
        />
      }
    >
      <section className="py-16 bg-background relative z-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <EditorialHeading
              line1="Pick the plan"
              line2="that fits today"
              description="Start free, upgrade when you're ready to scale content production."
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
                  <span
                    className={`text-sm ${plan.featured ? "opacity-70" : "text-muted-foreground"}`}
                  >
                    {plan.period}
                  </span>
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
            14-day free trial on paid features · cancel anytime · no link schemes. Questions?{" "}
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
                  <th className="py-3 px-4 font-medium">goals.ac Growth</th>
                  <th className="py-3 pl-4 font-medium text-muted-foreground">Typical autopilot SEO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["12-month strategy roadmaps", "✓ Free", "✗"],
                  ["Editorial review before publish", "✓ Always", "Limited"],
                  ["AI visibility tracking", "✓", "✓"],
                  ["Backlink exchange network", "✗ White-hat only", "✓"],
                  ["CMS integrations (8+)", "✓", "4–5"],
                  ["Monthly price", "$49", "$99+"],
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
            question: "Is the roadmap generator free?",
            answer:
              "Browsing our public roadmap catalog is free with no signup. Signed-in users can generate custom roadmaps — Starter includes 3 per month; Growth and Scale plans include unlimited.",
          },
          {
            question: "Can I change plans later?",
            answer: "Yes. Upgrade or downgrade any time from your account settings.",
          },
          {
            question: "What happens if I exceed my content limit?",
            answer:
              "You'll be prompted to upgrade. We never charge overage fees without your consent.",
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
        secondaryHref="/features"
        secondaryLabel="Explore features →"
      />
    </MarketingPageShell>
  );
}
