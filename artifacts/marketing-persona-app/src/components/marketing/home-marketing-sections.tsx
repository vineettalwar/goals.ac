"use client";

import { useRef } from "react";
import { BarChart3, Lock, MessageSquare, Search } from "lucide-react";
import { MarketingSection } from "./marketing-section";
import { DarkCTABand } from "./dark-cta-band";
import { PlatformFeaturesSection } from "./platform-features-section";
import { ArticleExampleSection } from "./article-example-section";
import { WorkflowSection } from "./workflow-section";
import { FAQAccordion } from "./faq-accordion";
import { MarketingCTA } from "./marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";

const HOW_IT_WORKS_STEPS = [
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
] as const;

function HowItWorksSteps() {
  const gridRef = useRef<HTMLDivElement>(null);
  useMarketingScrollReveal(gridRef, ".scroll-reveal");

  return (
    <div ref={gridRef} className="grid md:grid-cols-3 gap-6">
      {HOW_IT_WORKS_STEPS.map((item) => (
        <div key={item.step} className="scroll-reveal paper-card rounded-2xl p-6 h-full">
          <div className="text-3xl font-bold text-primary mb-3">{item.step}</div>
          <h3 className="text-lg font-bold mb-2">{item.title}</h3>
          <p className="text-base text-muted-foreground leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function HomeMarketingSections() {
  return (
    <>
      <PlatformFeaturesSection />

      <DarkCTABand
        badge="Free tool"
        titleLine1="Do ChatGPT, Claude, Perplexity"
        titleLine2="& Gemini recommend you?"
        description="Run a free GEO audit. No account required. See schema gaps, weak metadata, and structure issues."
        backgroundImage={HERO_IMAGES.geoAudit.hero}
        primaryCta={{ label: "Run free audit", href: "/geo-audit" }}
        secondaryCta={{ label: "All free tools", href: "/free-tools" }}
      />

      <MarketingSection
        variant="paper"
        bordered
        titleLine1="Traffic growth"
        titleLine2="in three steps"
        description="Business analysis, plan and draft, then review, publish, and track AI visibility."
        className="py-24 bg-background"
        animate={false}
      >
        <HowItWorksSteps />
      </MarketingSection>

      <ArticleExampleSection />
      <WorkflowSection />

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
        items={[
          {
            question: "How is this different from autopilot SEO tools?",
            answer:
              "Most tools optimize for volume and link exchanges. goals.ac leads with 12-month strategy, editorial review, and white-hat internal linking at a fraction of the price.",
          },
          {
            question: "Do you use backlink exchange networks?",
            answer:
              "No. We build authority with content clusters, internal links, and GEO-ready pages, not paid link schemes that risk Google penalties.",
          },
          {
            question: "Is the roadmap generator really free?",
            answer:
              "Yes. A free account unlocks custom roadmap generation. Browsing our public roadmap catalog is free with no signup.",
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
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { icon: Search, title: "Competitor Analysis", desc: "Compare topics, positioning, and content gaps." },
            { icon: BarChart3, title: "Keyword Tracking", desc: "Track target queries, positions, and assigned pages." },
            { icon: MessageSquare, title: "AI Visibility", desc: "Monitor citations across ChatGPT, Perplexity, and more." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card rounded-2xl p-6 relative">
              <Lock className="h-4 w-4 text-white/40 absolute top-5 right-5" aria-hidden />
              <Icon className="h-5 w-5 text-white/80 mb-4" />
              <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
              <p className="text-base text-white/70 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </DarkCTABand>

      <MarketingCTA
        badge="For lean B2B teams"
        titleLine1="Strategy before"
        titleLine2="volume"
        description="Start with a roadmap you can inspect, edit, and turn into work, not another black-box autopilot."
        variant="dark"
        backgroundImage={HERO_IMAGES.home.footer}
        secondaryHref="/compare/ai-seo-tools"
        secondaryLabel="Compare AI SEO tools →"
      />
    </>
  );
}
