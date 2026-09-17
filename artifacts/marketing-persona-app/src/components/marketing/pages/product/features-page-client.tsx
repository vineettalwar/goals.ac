"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  Eye,
  FileText,
  Globe,
  Link2,
  Map as MapIcon,
  MessageCircle,
  MessageSquare,
  PenLine,
  Search,
  Target,
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
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");

const FEATURE_PILLARS = [
  {
    title: "Desk",
    features: [
      {
        icon: MessageCircle,
        title: "SEO Chat",
        desc: "Onboard from a URL, scan opportunities, draft with ask-before-draft, queue Actions, approve publish. Grounded replies only.",
        href: "/content-engine",
      },
      {
        icon: MapIcon,
        title: "12-month roadmaps",
        desc: "Sequential plan from brand facts, GSC, and goals — plus calendar and topical map.",
        href: "/content-strategy",
      },
      {
        icon: PenLine,
        title: "Brand voice",
        desc: "Scrape → editable skill doc → topic passages at draft time.",
        href: "/brand-voice",
      },
      {
        icon: Search,
        title: "Competitor research",
        desc: "Real crawl (fails if the homepage is blocked). Evidence pages stored — no fake analyses.",
        href: "/search-analytics",
      },
    ],
  },
  {
    title: "Studio",
    features: [
      {
        icon: FileText,
        title: "Content Studio",
        desc: "Brief → draft → humanize → dual score → publish. Formats include comparison, listicle, and case study.",
        href: "/content-engine",
      },
      {
        icon: Zap,
        title: "Content Autopilot",
        desc: "Daily or weekly on the same Studio path. Manual or draft by default; live auto-publish optional.",
        href: "/content-autopilot",
      },
      {
        icon: Globe,
        title: "WordPress-first CMS",
        desc: "Deep WordPress (plugin, Rank Math, featured image, draft-first). Ghost and Shopify deep; others Basic.",
        href: "/cms-publishing",
      },
      {
        icon: Link2,
        title: "Internal link hub",
        desc: "Site-wide link graph and contextual suggestions on publish — not link schemes.",
        href: "/link-building",
      },
    ],
  },
  {
    title: "Measure",
    features: [
      {
        icon: Target,
        title: "Action Queue",
        desc: "GSC-grounded CTR gaps, slip, and decay. Run, approve, or dismiss — then measure.",
        href: "/search-analytics",
      },
      {
        icon: Eye,
        title: "AI visibility",
        desc: "Citation snapshots across ChatGPT, Perplexity, Claude, and Gemini when provider creds are set.",
        href: "/llm-visibility",
      },
      {
        icon: Search,
        title: "GEO audit",
        desc: "Schema, meta, llms.txt, AI robots, citations, citability — free on marketing, same engine in-app.",
        href: "/geo-audit",
      },
      {
        icon: BarChart3,
        title: "Search analytics",
        desc: "GSC + GA4 article performance. Rank snapshots when DataForSEO is configured.",
        href: "/search-analytics",
      },
      {
        icon: Wallet,
        title: "BYOK",
        desc: "Bring Gemini or Bedrock keys for cost control when your plan allows.",
      },
    ],
  },
] as const;

const BETA_FEATURES = [
  {
    icon: Link2,
    title: "Internal Link Hub",
    desc: "Orphan pages, link suggestions, and cluster coverage on WordPress publish.",
  },
  {
    icon: MessageSquare,
    title: "Reddit Discovery",
    desc: "Live thread search and draft replies. You post yourself — no auto-posting.",
  },
  {
    icon: Globe,
    title: "Multilingual drafts",
    desc: "Major locales in beta. Localized keyword research is waitlist — not native-quality at scale yet.",
  },
] as const;

const COMING_SOON = [
  { title: "AI article hero images", key: "ai-images" },
  { title: "Agency white-label reseller", key: "agency-reseller" },
  { title: "Localized keyword research + more locales", key: "multilingual-50" },
  { title: "Link outreach playbook", key: "link-building-playbook" },
  { title: "Dedicated SEO strategist (retainer)", key: "dedicated-strategist" },
] as const;

const WORKFLOW_STEPS = [
  {
    title: "Ground the brand",
    desc: "Add market, audience, voice, GSC, and CMS once — or onboard from a URL in SEO Chat.",
  },
  {
    title: "Plan and draft",
    desc: "Roadmaps, Action Queue, or Studio. Briefs first; drafts inherit voice and citations.",
  },
  {
    title: "Review and publish",
    desc: "Approve work, push WordPress draft-first, track AI citations and search slip.",
  },
] as const;

function FeaturesCapabilitiesSection() {
  const paperRef = useRef<HTMLDivElement>(null);

  useMarketingScrollReveal(paperRef, ".feature-pillar, .feature-row");

  return (
    <section className="relative bg-black">
      <div className="border-b border-white/10 py-24 text-white">
        <div className="mx-auto max-w-5xl px-6">
          <EditorialHeading
            line1="Everything on one"
            line2="desk"
            description="Chat, Studio, Action Queue, GEO, and WordPress-first publish — without switching tools."
            theme="dark"
          />
        </div>
      </div>

      <div ref={paperRef} className="border-t border-white/10 bg-black py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-12 md:grid-cols-3 md:gap-10">
            {FEATURE_PILLARS.map((pillar) => (
              <div key={pillar.title} className="feature-pillar">
                <h3 className="mb-6 font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">
                  {pillar.title}
                </h3>
                <ul className="space-y-6">
                  {pillar.features.map((feature) => {
                    const { title, desc } = feature;
                    const href = "href" in feature ? feature.href : undefined;
                    return (
                      <li key={title} className="feature-row">
                        <h4 className="mb-1.5 font-semibold text-white">{title}</h4>
                        <p className="text-sm leading-relaxed text-white/65">{desc}</p>
                        {href ? (
                          <Link
                            href={href}
                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-(--accent-warm) hover:underline"
                          >
                            Learn more <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
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
      <div ref={contentRef} className="grid gap-12 md:grid-cols-2">
        <div className="scroll-reveal">
          <div className="mb-6 flex items-center gap-2">
            <FeatureStatusBadge status="beta" />
            <span className="text-base font-medium text-white">Live with limits</span>
          </div>
          <ul className="space-y-6">
            {BETA_FEATURES.map(({ title, desc }) => (
              <li key={title}>
                <h3 className="mb-1.5 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{desc}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="scroll-reveal">
          <div className="mb-6 flex items-center gap-2">
            <FeatureStatusBadge status="coming-soon" />
            <span className="text-base font-medium text-white">Join the waitlist</span>
          </div>
          <ul className="mb-6 space-y-3">
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
  const listRef = useRef<HTMLOListElement>(null);
  useMarketingScrollReveal(listRef, ".scroll-reveal");

  return (
    <MarketingSection
      titleLine1="A clear path"
      titleLine2="from research to publish"
      bordered
      className="py-24"
      animate={false}
    >
      <ol ref={listRef} className="max-w-2xl space-y-8">
        {WORKFLOW_STEPS.map((item) => (
          <li key={item.title} className="scroll-reveal">
            <h3 className="font-semibold text-white">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/65">{item.desc}</p>
          </li>
        ))}
      </ol>
    </MarketingSection>
  );
}

export function FeaturesPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          titleLine1="The content desk"
          titleLine2="for research to publish"
          description="SEO Chat, Content Studio, Action Queue, GEO, and WordPress-first CMS. You sign off before anything goes live. Hands-on GEO programs are optional."
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "See Content Studio", href: "/content-engine", variant: "ghost" },
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
        description="Sign up and run Chat or Studio on one keyword. Free GEO audit and article quality demo need no account."
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
              "Yes. Bring Gemini or Bedrock keys when your plan allows BYOK. Retainer programs can add editorial oversight.",
          },
          {
            question: "What's included before a scoped program?",
            answer:
              "Free GEO audit, article quality demo, and SEO tools. No credit card. Sign up to open the full content desk.",
          },
          {
            question: "How do social integrations work?",
            answer:
              "Connect OAuth per project on the Publishing tab, generate social-format content from an approved article, and publish from Social Hub.",
            helpHref: "/help/publish-social-content",
          },
        ]}
      />

      <MarketingCTA
        titleLine1="Compare with"
        titleLine2="autopilot SEO tools"
        description="See how the desk stacks up on strategy, control, and editorial oversight versus volume-only autopilot tools."
        variant="dark"
        secondaryHref="/compare/ai-seo-tools"
        secondaryLabel="View comparison →"
      />
    </MarketingPageShell>
  );
}
