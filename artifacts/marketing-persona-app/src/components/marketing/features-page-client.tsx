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
  Map,
  MessageSquare,
  Network,
  Search,
  Wallet,
  Zap,
} from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { EditorialHeading } from "@/components/marketing/editorial-heading";
import { DarkCTABand } from "@/components/marketing/dark-cta-band";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { VideoDemoSection } from "@/components/marketing/video-demo-section";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { FeatureStatusBadge } from "@/components/feature-status-badge";
import { WaitlistForm } from "@/components/waitlist-form";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";
import { useMarketingParallax, useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

const FEATURE_PILLARS = [
  {
    title: "Plan",
    features: [
      {
        icon: Map,
        title: "12-month growth roadmaps",
        desc: "Free strategic roadmaps. Unique vs autopilot-only tools.",
        href: "/roadmaps",
      },
      {
        icon: LayoutGrid,
        title: "30-day content strategy",
        desc: "Calendar from your roadmap with formats, owners, and rationale.",
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
        desc: "Bring your Gemini key or use platform AI with cost tracking.",
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
  const headerBandRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  useMarketingParallax(headerBandRef, bgRef);
  useMarketingScrollReveal(paperRef, ".feature-pillar, .feature-row");

  return (
    <section className="relative bg-black">
      <div ref={headerBandRef} className="relative min-h-[40vh] py-24 overflow-hidden text-white">
        <div
          ref={bgRef}
          className="absolute inset-0 -top-[15%] -bottom-[15%] bg-center bg-cover bg-no-repeat z-0"
          style={{ backgroundImage: `url(${HERO_IMAGES.features.capabilities})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/55 z-0" aria-hidden />

        <div className="absolute top-0 left-0 right-0 h-24 section-bridge-top pointer-events-none z-10" aria-hidden />

        <div className="relative z-20 max-w-5xl mx-auto px-6">
          <EditorialHeading
            line1="Everything in one"
            line2="workflow"
            description="From 12-month strategy to published article, without switching tools."
            theme="dark"
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 features-bridge pointer-events-none z-10" aria-hidden />
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
                              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
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
          <WaitlistForm featureKey="features-roadmap" buttonLabel="Notify me" />
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
            <div className="text-3xl font-bold text-primary mb-3">{item.step}</div>
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
          titleLine1="Strategy-first"
          titleLine2="AI content platform"
          description="Everything autopilot SEO tools offer, plus roadmaps, editorial control, and white-hat authority building."
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[
            { label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF, variant: "primary" },
            { label: "Compare tools", href: "/compare/ai-seo-tools", variant: "ghost" },
          ]}
        />
      }
    >
      <FeaturesCapabilitiesSection />
      <BetaComingSoonSection />
      <WorkflowStepsSection />
      <VideoDemoSection />

      <DarkCTABand
        titleLine1="Ready to test"
        titleLine2="your first workflow?"
        description="Book a discovery call to see how strategy-first content production fits your team."
        backgroundImage={HERO_IMAGES.features.cta}
        primaryCta={{ label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF }}
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
            answer: "Yes. Technical teams can self-serve with BYOK on Starter. Engagements include platform access with editorial oversight.",
          },
          {
            question: "What's included before an engagement?",
            answer:
              "Free growth roadmaps, GEO audit, and free SEO tools — no credit card required. Full platform access is scoped on a discovery call.",
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
        description="See how goals.ac stacks up on strategy, control, and pricing."
        variant="dark"
        backgroundImage={HERO_IMAGES.features.footer}
        secondaryHref="/compare/ai-seo-tools"
        secondaryLabel="View comparison →"
      />
    </MarketingPageShell>
  );
}
