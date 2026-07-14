"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  Eye,
  FileText,
  Globe,
  Layers,
  LayoutGrid,
  Link2,
  MessageSquare,
  Network,
  Search,
  Wallet,
  Zap,
} from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { EditorialHeading } from "@/components/marketing/sections/editorial-heading";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { FAQAccordion } from "@/components/marketing/sections/faq-accordion";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { FeatureStatusBadge } from "@/components/shared/feature-status-badge";
import { WaitlistForm } from "@/components/shared/waitlist-form";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import {
  CONTACT_CTA_LABEL,
  CONTACT_HREF,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

const FEATURE_PILLARS = [
  {
    title: "Plan",
    features: [
      {
        icon: Search,
        title: "Keyword & competitor research",
        desc: "Briefs grounded in search intent, gaps, and what competitors already rank for.",
        href: "/search-analytics",
      },
      {
        icon: LayoutGrid,
        title: "30-day content strategy",
        desc: "Prioritized calendar with formats, owners, and rationale from your research.",
        href: "/content-strategy",
      },
      {
        icon: Layers,
        title: "Content Agent workflow",
        desc: "Goals, topic ideas, angles, and articles in one flow.",
        href: "/content-engine",
      },
      {
        icon: Network,
        title: "Topical authority map",
        desc: "Cluster coverage, gaps, and recommended next articles.",
      },
    ],
  },
  {
    title: "Publish",
    features: [
      {
        icon: FileText,
        title: "Humanized long-form articles",
        desc: "1,400 to 1,800 word drafts with citations, FAQ, and quality scores.",
        href: "/content-engine",
      },
      {
        icon: Zap,
        title: "Content Autopilot",
        desc: "Daily or weekly queue with manual, draft, or live publish modes.",
        href: "/content-autopilot",
      },
      {
        icon: Globe,
        title: "CMS publishing",
        desc: "WordPress, Shopify, Drupal, Joomla, Notion, Webflow, Ghost.",
        href: "/cms-publishing",
      },
      {
        icon: Link2,
        title: "Internal link hub",
        desc: "Site-wide link graph and contextual suggestions, not link schemes.",
        href: "/link-building",
      },
    ],
  },
  {
    title: "Measure",
    features: [
      {
        icon: Eye,
        title: "AI visibility tracking",
        desc: "Citation rates across ChatGPT, Perplexity, Claude, and Gemini.",
        href: "/llm-visibility",
      },
      {
        icon: Search,
        title: "GEO audit",
        desc: "Schema, metadata, and structure checks for AI crawlers.",
        href: "/geo-audit",
      },
      {
        icon: BarChart3,
        title: "Keyword tracking",
        desc: "SERP positions, content gaps, and rank alerts.",
      },
      {
        icon: Wallet,
        title: "BYOK and platform AI",
        desc: "Bring your Gemini, OpenAI, or Bedrock key on scoped programs for unlimited generations.",
      },
    ],
  },
] as const;

const BETA_FEATURES = [
  {
    icon: Link2,
    title: "Internal Link Hub",
    desc: "Orphan pages, link suggestions, and cluster coverage.",
  },
  {
    icon: MessageSquare,
    title: "Reddit Discovery",
    desc: "Thread finder and draft replies. No auto-posting.",
  },
  {
    icon: Globe,
    title: "25+ languages",
    desc: "Native-quality B2B content in major European languages.",
  },
] as const;

const COMING_SOON = [
  { title: "AI article hero images", key: "ai-images" },
  { title: "Agency white-label reseller", key: "agency-reseller" },
  { title: "50+ languages", key: "multilingual-50" },
  { title: "Link outreach playbook", key: "link-building-playbook" },
] as const;

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Set your brand context",
    desc: "Add market, audience, voice, and CMS connections once.",
  },
  {
    step: "02",
    title: "Plan and draft",
    desc: "Choose priorities, review briefs, and generate structured drafts.",
  },
  {
    step: "03",
    title: "Review and publish",
    desc: "Approve work, push to your CMS, and track AI citations.",
  },
] as const;

function FeaturesCapabilitiesSection() {
  const paperRef = useRef<HTMLDivElement>(null);

  useMarketingScrollReveal(paperRef, ".feature-pillar, .feature-row");

  return (
    <section className="relative bg-black">
      <div className="py-24 text-white border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <EditorialHeading
            line1="Everything in one"
            line2="workflow"
            description="From 12-month strategy to published article, without switching tools."
            theme="dark"
          />
        </div>
      </div>

      <div ref={paperRef} className="py-20 bg-black border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 md:gap-10">
            {FEATURE_PILLARS.map((pillar) => (
              <div key={pillar.title} className="feature-pillar">
                <h3 className="text-xl font-bold tracking-tight mb-6 text-white">{pillar.title}</h3>
                <ul className="space-y-6">
                  {pillar.features.map((feature) => {
                    const { icon: Icon, title, desc } = feature;
                    const href = "href" in feature ? feature.href : undefined;
                    return (
                    <li key={title} className="feature-row">
                      <div className="flex gap-4">
                        <div className="shrink-0 mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white mb-1.5">{title}</h4>
                          <p className="text-base text-white/65 leading-relaxed">{desc}</p>
                          {href && (
                            <Link
                              href={href}
                              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-(--accent-warm) hover:underline"
                            >
                              Learn more <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BetaComingSoonSection() {
  const contentRef = useRef<HTMLDivElement>(null);
  useMarketingScrollReveal(contentRef, ".scroll-reveal");

  return (
    <MarketingSection
      bordered
      className="py-20"
      titleLine1="Beta and"
      titleLine2="coming soon"
      animate={false}
    >
      <div ref={contentRef} className="grid md:grid-cols-2 gap-12">
        <div className="scroll-reveal">
          <div className="flex items-center gap-2 mb-6">
            <FeatureStatusBadge status="beta" />
            <span className="text-base font-medium text-white">Live with limits</span>
          </div>
          <ul className="space-y-6">
            {BETA_FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title}>
                <div className="flex gap-4">
                  <div className="shrink-0 mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1.5">{title}</h3>
                    <p className="text-base text-white/65 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="scroll-reveal">
          <div className="flex items-center gap-2 mb-6">
            <FeatureStatusBadge status="coming-soon" />
            <span className="text-base font-medium text-white">Join the waitlist</span>
          </div>
          <ul className="space-y-3 mb-6">
            {COMING_SOON.map((item) => (
              <li key={item.key} className={`${glassCard} px-5 py-4 text-base font-medium text-white`}>
                {item.title}
              </li>
            ))}
          </ul>
          <WaitlistForm featureKey="features-roadmap" buttonLabel="Notify me" variant="dark" />
        </div>
      </div>
    </MarketingSection>
  );
}

function WorkflowStepsSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  useMarketingScrollReveal(gridRef, ".scroll-reveal");

  return (
    <MarketingSection
      titleLine1="A clear path"
      titleLine2="from research to publish"
      bordered
      className="py-24"
      animate={false}
    >
      <div ref={gridRef} className="grid md:grid-cols-3 gap-6">
        {WORKFLOW_STEPS.map((item) => (
          <div key={item.step} className={`scroll-reveal ${glassCard} p-6 h-full`}>
            <div className="text-3xl font-bold text-(--accent-warm) mb-3">{item.step}</div>
            <h3 className="text-lg font-bold mb-2 text-white">{item.title}</h3>
            <p className="text-base text-white/65 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </MarketingSection>
  );
}

export function FeaturesPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          titleLine1="The content studio"
          titleLine2="behind scoped programs"
          description="Research, drafts, cross-platform publishing, and AI visibility. One workspace — you sign off before anything goes live."
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "Compare tools", href: "/compare/ai-seo-tools", variant: "ghost" },
          ]}
        />
      }
    >
      <FeaturesCapabilitiesSection />
      <BetaComingSoonSection />
      <WorkflowStepsSection />

      <DarkCTABand
        titleLine1="Ready to test"
        titleLine2="your first workflow?"
        description="Sign up and see how research-driven content production fits your team."
        primaryCta={{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF }}
        secondaryCta={{ label: "Free tools", href: "/free-tools" }}
      />

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
        items={[
          {
            question: "Do you use backlink exchange networks?",
            answer:
              "No. We focus on internal linking, topical authority, and GEO-ready content.",
          },
          {
            question: "Can I use my own AI API key?",
            answer:
              "Yes. Scoped programs include platform access with BYOK support and editorial oversight from your strategist.",
          },
          {
            question: "What's included before a scoped program?",
            answer:
              "Free GEO audit, article quality demo, and SEO tools. No credit card. Sign up to open the full content studio.",
          },
          {
            question: "How do social integrations work?",
            answer:
              "Connect OAuth per project on the Publishing tab, generate social-format content, and publish in one click from Content Studio.",
            helpHref: "/help/publish-social-content",
          },
        ]}
      />

      <MarketingCTA
        titleLine1="Compare with"
        titleLine2="autopilot SEO tools"
        description="See how a consulting-led program stacks up on strategy, control, and editorial oversight."
        variant="dark"
        secondaryHref="/compare/ai-seo-tools"
        secondaryLabel="View comparison →"
      />
    </MarketingPageShell>
  );
}
