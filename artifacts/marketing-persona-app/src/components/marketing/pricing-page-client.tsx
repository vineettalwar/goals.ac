"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
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
          backgroundImage={HERO_IMAGES.pricing}
          ctas={[{ label: "Start free", href: "/signup", variant: "primary" }]}
        />
      }
    >
      <section className="py-16 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 flex flex-col paper-card-hover ${
                  plan.featured
                    ? "bg-primary text-primary-foreground shadow-lg"
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
                  className={`text-center px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-90 ${
                    plan.featured ? "bg-white text-primary" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-10">
            All plans include a 14-day free trial on paid features. Questions?{" "}
            <a href="mailto:hello@goals.ac" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </section>

      <FAQAccordion
        title="Pricing questions"
        items={[
          {
            question: "Is the roadmap generator free?",
            answer: "Yes — fully free with no signup. Paid plans unlock the full content engine and publishing.",
          },
          {
            question: "Can I change plans later?",
            answer: "Yes. Upgrade or downgrade any time from your account settings.",
          },
          {
            question: "What happens if I exceed my content limit?",
            answer: "You'll be prompted to upgrade. We never charge overage fees without your consent.",
          },
        ]}
      />

      <MarketingCTA
        title="Start with a free roadmap."
        description="No credit card required. Generate your 12-month growth plan in minutes."
        primaryLabel="Create free account"
        secondaryHref="/features"
        secondaryLabel="Explore features →"
      />
    </MarketingPageShell>
  );
}
