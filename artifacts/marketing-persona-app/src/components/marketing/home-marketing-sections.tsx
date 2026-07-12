"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  GitBranch,
  Key,
  LayoutGrid,
  Lock,
  MessageSquare,
  Pencil,
  Search,
} from "lucide-react";
import { MarketingSection } from "./marketing-section";
import { DarkCTABand } from "./dark-cta-band";
import { FAQAccordion } from "./faq-accordion";
import { MarketingCTA } from "./marketing-cta";
import { FeatureStatusBadge } from "@/components/feature-status-badge";
import { cardSurfaceClass } from "@/lib/marketing-surfaces";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";
import { PLATFORM_FEATURES } from "@/lib/marketing-feature-data";

const CMS_PLATFORMS = [
  "WordPress",
  "Shopify",
  "Drupal",
  "Joomla",
  "Notion",
  "Webflow",
  "Ghost",
  "LinkedIn",
  "X / Twitter",
  "Bluesky",
  "Mastodon",
];

const glassCard = cardSurfaceClass("glass");

const DEMO_SCORE = 92;

export function HomeMarketingSections() {
  return (
    <>
      <MarketingSection
        variant="image"
        backgroundImage={HERO_IMAGES.home.workflow}
        bridgeTop
        badge="Platform features"
        titleLine1="A powerful suite"
        titleLine2="— all in one place"
        description="Everything BabyLoveGrowth-style autopilot tools promise — plus strategy depth and editorial control."
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_FEATURES.map(({ icon: Icon, title, desc, status }) => (
            <div key={title} className={`${glassCard} p-5 flex flex-col`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="rounded-xl border border-white/20 bg-white/10 w-9 h-9 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                {status !== "live" && <FeatureStatusBadge status={status} className="shrink-0" />}
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{title}</h3>
              <p className="text-xs text-white/65 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <DarkCTABand
        badge="Free tool"
        titleLine1="Do ChatGPT, Claude, Perplexity"
        titleLine2="& Gemini recommend you?"
        description="Run a free GEO audit — no account required. See schema gaps, weak metadata, and structure issues."
        backgroundImage={HERO_IMAGES.geoAudit.hero}
        primaryCta={{ label: "Run free audit", href: "/geo-audit" }}
        secondaryCta={{ label: "All free tools", href: "/free-tools" }}
      />

      <MarketingSection
        variant="paper"
        bordered
        badge="How it works"
        titleLine1="Traffic growth"
        titleLine2="in three steps"
        description="Business analysis → plan and draft → review, publish, and track AI visibility."
        className="py-24 bg-background"
      >
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Business analysis",
              desc: "We analyze your market, audience, niche, and competitors to find winnable visibility gaps.",
            },
            {
              step: "02",
              title: "Plan and draft",
              desc: "30-day calendar, briefs, and GEO-ready drafts with citations, FAQ, and schema.",
            },
            {
              step: "03",
              title: "Review, publish, measure",
              desc: "Approve work, push to your CMS, and track rankings plus AI citation rates.",
            },
          ].map((item, i) => (
            <div key={item.step} className="relative">
              <div className="paper-card rounded-2xl p-6 h-full">
                <div className="text-3xl font-bold text-primary mb-3">{item.step}</div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-muted-foreground/30">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        variant="image"
        backgroundImage={HERO_IMAGES.features.capabilities}
        badge="Examples"
        titleLine1="Not just written for you"
        titleLine2="— written like you"
        description="Every article inherits brand voice, internal links, citations, and a quality score you can inspect."
      >
        <div className={`${glassCard} p-6 max-w-3xl mx-auto`}>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative h-[88px] w-[88px] flex items-center justify-center">
                <svg width={88} height={88} viewBox="0 0 88 88" className="-rotate-90 absolute">
                  <circle cx={44} cy={44} r={36} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={6} />
                  <circle
                    cx={44}
                    cy={44}
                    r={36}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={6}
                    strokeDasharray={226}
                    strokeDashoffset={226 - (DEMO_SCORE / 100) * 226}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-2xl font-bold text-white">{DEMO_SCORE}</span>
                  <span className="block text-[10px] text-white/60">/ 100</span>
                </div>
              </div>
              <span className="text-xs text-white/60 mt-2">Article score</span>
            </div>
            <div className="flex-1 space-y-3 text-sm text-white/80">
              <p className="font-semibold text-white">Sample B2B SaaS article</p>
              <div className="flex flex-wrap gap-1.5">
                {["evidence-based", "founder-friendly", "action-oriented"].map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                    {t}
                  </span>
                ))}
              </div>
              <ul className="text-xs text-white/65 space-y-1">
                <li>✓ 6 H2 sections + FAQ</li>
                <li>✓ 4 citations + 5 internal links</li>
                <li>✓ JSON-LD schema + optimized meta</li>
                <li>✓ 1,847 words</li>
              </ul>
              <Link href="/signup" className="inline-flex items-center gap-1 text-xs text-white hover:underline">
                Generate yours <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection
        variant="image"
        backgroundImage={HERO_IMAGES.home.workflow}
        badge="What you can do"
        titleLine1="One place to"
        titleLine2="run the workflow"
        description="Turn research into briefs and drafts, keep review in the loop, then publish and measure the result."
      >
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {[
            {
              icon: Pencil,
              title: "Draft from a real brief",
              desc: "Set audience, search intent, angle, evidence, and brand voice before a draft is written.",
            },
            {
              icon: LayoutGrid,
              title: "Plan the next 30 days",
              desc: "Prioritize topics using your site, competitors, and tracked queries.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className={`${glassCard} p-6 flex flex-col`}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <div className="rounded-xl border border-white/20 bg-white/10 w-9 h-9 flex items-center justify-center shrink-0 ml-3">
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <p className="text-sm text-white/65 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: Bookmark,
              title: "Controlled publishing",
              desc: "Connect your CMS once. Keep one review process across every destination.",
            },
            {
              icon: GitBranch,
              title: "Use your existing CMS",
              desc: "WordPress, Shopify, Notion, Ghost, and more — via native APIs or goals.ac plugins.",
            },
            {
              icon: Key,
              title: "Technical visibility audit",
              desc: "Find missing schema, weak metadata, and page structure that hurts citation.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className={`${glassCard} p-6 flex flex-col`}>
              <div className="rounded-xl border border-white/20 bg-white/10 w-9 h-9 flex items-center justify-center mb-4">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-bold mb-2 text-white">{title}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {CMS_PLATFORMS.map((name) => (
            <span
              key={name}
              className="text-xs font-medium px-3 py-1 rounded-full border border-white/20 bg-white/10 text-white/75"
            >
              {name}
            </span>
          ))}
        </div>
      </MarketingSection>

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
        items={[
          {
            question: "How is this different from autopilot SEO tools?",
            answer:
              "Most tools optimize for volume and link exchanges. goals.ac leads with 12-month strategy, editorial review, and white-hat internal linking — at a fraction of the price.",
          },
          {
            question: "Do you use backlink exchange networks?",
            answer:
              "No. We build authority with content clusters, internal links, and GEO-ready pages — not paid link schemes that risk Google penalties.",
          },
          {
            question: "Is the roadmap generator really free?",
            answer:
              "Yes — a free account unlocks custom roadmap generation. Browsing our public roadmap catalog is free with no signup.",
          },
          {
            question: "What's a GEO audit?",
            answer:
              "GEO (Generative Engine Optimization) scans your site for gaps that hurt visibility in ChatGPT, Perplexity, Claude, Gemini, and Google AI.",
          },
          {
            question: "Can I publish to LinkedIn and X?",
            answer:
              "Yes. Connect LinkedIn, X, Meta, Bluesky, or Mastodon per project, then publish social formats directly from Content Studio.",
            helpHref: "/help/publish-social-content",
          },
        ]}
      />

      <DarkCTABand
        badge="Free with signup"
        titleLine1="Continue from roadmap"
        titleLine2="to execution"
        description="Save your roadmap, analyze competitors, track AI visibility, and turn priorities into briefs and drafts."
        backgroundImage={HERO_IMAGES.home.signup}
        primaryCta={{ label: "Create free account", href: "/signup" }}
        secondaryCta={{ label: "Sign in", href: "/login" }}
      >
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {[
            { icon: Search, title: "Competitor Analysis", desc: "Compare topics, positioning, and content gaps." },
            { icon: BarChart3, title: "Keyword Tracking", desc: "Track target queries, positions, and assigned pages." },
            { icon: MessageSquare, title: "AI Visibility", desc: "Monitor citations across ChatGPT, Perplexity, and more." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card glass-card-hover rounded-2xl p-6 relative">
              <Lock className="h-3.5 w-3.5 text-white/40 absolute top-4 right-4" />
              <Icon className="h-5 w-5 text-white/80 mb-4" />
              <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </DarkCTABand>

      <MarketingCTA
        badge="For lean B2B teams"
        titleLine1="Strategy before"
        titleLine2="volume"
        description="Start with a roadmap you can inspect, edit, and turn into work — not another black-box autopilot."
        variant="dark"
        backgroundImage={HERO_IMAGES.home.footer}
        secondaryHref="/compare/ai-seo-tools"
        secondaryLabel="Compare AI SEO tools →"
      />
    </>
  );
}
