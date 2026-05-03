import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, ArrowRight, Zap } from "lucide-react";
import { useAuth } from "@/context/auth";

interface Tier {
  name: string;
  price: string;
  pricePeriod?: string;
  description: string;
  features: { label: string; included: boolean }[];
  cta: string;
  ctaTo: string;
  highlight?: boolean;
  badge?: string;
}

export default function Pricing() {
  const { user } = useAuth();

  const tiers: Tier[] = [
    {
      name: "Free",
      price: "$0",
      pricePeriod: "forever",
      description: "Everything a founder needs to plan and ship a growth strategy.",
      features: [
        { label: "Unlimited 12-month growth roadmaps", included: true },
        { label: "Free GEO audit (no signup)", included: true },
        { label: "AI strategy chat on every roadmap", included: true },
        { label: "Competitor analysis (3 / month)", included: true },
        { label: "Keyword tracking (10 keywords)", included: true },
        { label: "Roadmap directory access", included: true },
        { label: "PDF export", included: true },
        { label: "Priority AI processing", included: false },
        { label: "Unlimited competitor analyses", included: false },
        { label: "100+ tracked keywords", included: false },
      ],
      cta: user ? "You're on Free" : "Start for free",
      ctaTo: user ? "/dashboard" : "/signup",
    },
    {
      name: "Pro",
      price: "$29",
      pricePeriod: "/month",
      description: "For founders ready to scale content and outpace competitors.",
      highlight: true,
      badge: "Most popular",
      features: [
        { label: "Everything in Free", included: true },
        { label: "Unlimited competitor analyses", included: true },
        { label: "100+ tracked keywords", included: true },
        { label: "Priority AI processing (Gemini Pro)", included: true },
        { label: "Multi-CMS publishing (Notion, Webflow, WordPress)", included: true },
        { label: "Content studio with drag-and-drop calendar", included: true },
        { label: "Advanced GEO audit reports", included: true },
        { label: "Custom branding on exports", included: true },
        { label: "Email reports & alerts", included: true },
        { label: "Priority support", included: true },
      ],
      cta: "Start Pro trial",
      ctaTo: user ? "/settings" : "/signup",
    },
    {
      name: "Team",
      price: "$99",
      pricePeriod: "/month",
      description: "For growth teams running content & SEO at scale.",
      features: [
        { label: "Everything in Pro", included: true },
        { label: "Up to 5 team seats", included: true },
        { label: "Shared roadmaps & content library", included: true },
        { label: "Team analytics dashboard", included: true },
        { label: "Bring your own Gemini API key", included: true },
        { label: "API access (read + generate)", included: true },
        { label: "SOC 2 / GDPR compliance docs", included: true },
        { label: "Onboarding & strategy session", included: true },
        { label: "Dedicated Slack channel", included: true },
        { label: "SSO / SAML (coming soon)", included: true },
      ],
      cta: "Contact sales",
      ctaTo: "mailto:hello@goals.ac?subject=Team plan inquiry",
    },
  ];

  return (
    <Layout>
      <SEO
        title="Pricing — goals.ac"
        description="Free forever for the core platform. Pro and Team plans for founders ready to scale."
      />

      <div className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-mesh-dark text-zinc-50 border-b border-white/[0.06]">
          <div className="orb orb-primary w-[600px] h-[400px] top-[-10%] left-[50%] -translate-x-1/2" />

          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-zinc-300 mb-8 tracking-wide uppercase"
            >
              <Sparkles className="h-3 w-3" />
              Simple, transparent pricing
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.08]"
            >
              Free to start.{" "}
              <span className="text-gradient">Pay when you scale.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
            >
              No hidden fees. No credit card to start. Upgrade only when you outgrow Free.
            </motion.p>
          </div>
        </section>

        {/* Tiers */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            <div className="grid md:grid-cols-3 gap-6">
              {tiers.map((tier, i) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08 * i }}
                  className={`rounded-2xl border p-8 flex flex-col relative ${
                    tier.highlight
                      ? "border-blue-400/30 bg-blue-500/[0.04] shadow-lg shadow-blue-500/10 scale-[1.02]"
                      : "border-border bg-card"
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 text-white text-xs font-semibold px-3 py-1">
                      {tier.badge}
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{tier.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                      {tier.pricePeriod && (
                        <span className="text-sm text-muted-foreground">{tier.pricePeriod}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    asChild
                    size="lg"
                    className={`w-full mb-6 h-11 ${
                      tier.highlight
                        ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white border-0 glow-primary"
                        : ""
                    }`}
                    variant={tier.highlight ? "default" : "outline"}
                  >
                    {tier.ctaTo.startsWith("mailto:") ? (
                      <a href={tier.ctaTo}>{tier.cta}</a>
                    ) : (
                      <Link to={tier.ctaTo}>{tier.cta}</Link>
                    )}
                  </Button>

                  <ul className="space-y-3">
                    {tier.features.map((feat) => (
                      <li key={feat.label} className="flex items-start gap-2.5 text-sm">
                        {feat.included ? (
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={feat.included ? "text-foreground" : "text-muted-foreground/70 line-through"}>
                          {feat.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-background border-t border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
              Pricing FAQ
            </h2>
            <div className="space-y-5">
              {[
                {
                  q: "Is there really a free plan?",
                  a: "Yes. The Free plan is free forever — no card required. You get unlimited roadmaps, GEO audits, AI chat, and limited use of every other tool.",
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes. Cancel from your account settings in two clicks. You keep Pro features until the end of your billing period.",
                },
                {
                  q: "Do you offer a Pro trial?",
                  a: "Yes — every new account gets 14 days of Pro features automatically. No card required to start.",
                },
                {
                  q: "Can I bring my own Gemini API key?",
                  a: "Yes. On Team plan, you can connect your own Gemini API key for unlimited AI usage at no extra cost.",
                },
                {
                  q: "What payment methods do you accept?",
                  a: "All major credit cards via Stripe. Annual plans available with 2 months free — contact sales.",
                },
              ].map((faq) => (
                <div key={faq.q} className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-background border-t border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl text-center">
            <Zap className="h-10 w-10 text-blue-500 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Start free in 30 seconds.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              No credit card. No commitment. Just sign up and start building.
            </p>
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white border-0">
              <Link to={user ? "/dashboard" : "/signup"}>
                {user ? "Go to dashboard" : "Create free account"} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
