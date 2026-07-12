"use client";

import { Brain, Bot, Globe, Search, Wallet, Wand2 } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { DarkCTABand } from "@/components/marketing/dark-cta-band";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

const FEATURES = [
  {
    icon: Brain,
    title: "Content Agent workflow",
    description:
      "Tell the agent your goals, get researched topic ideas, refine angles, and build articles in one flow.",
  },
  {
    icon: Wand2,
    title: "Humanized long-form articles",
    description:
      "Generate 1400-1800 word drafts with citations, FAQ sections, and clean structure ready for editing and publishing.",
  },
  {
    icon: Globe,
    title: "WordPress publishing",
    description: "Connect WordPress once, then publish manually or auto-publish from your content queue.",
  },
  {
    icon: Wallet,
    title: "BYOK + platform AI",
    description:
      "Use your own Gemini API key to control spend, or use the platform key and track estimated generation costs.",
  },
  {
    icon: Search,
    title: "SEO + GEO alignment",
    description:
      "Build articles optimized for search intent and AI engines with schema-ready metadata and citation support.",
  },
  {
    icon: Bot,
    title: "Autopilot queue",
    description:
      "Keep a live queue of ready, published, and failed drafts with per-article status, source, and metadata.",
  },
];

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
    desc: "Approve work, push to your CMS, and track performance.",
  },
];

export function FeaturesPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Product features"
          titleLine1="Built for teams"
          titleLine2="who ship with AI"
          description="goals.ac combines research, writing, and publishing so teams can ship high-quality content faster."
          backgroundImage={HERO_IMAGES.features}
          ctas={[
            { label: "Start free", href: "/signup", variant: "primary" },
            { label: "See pricing", href: "/pricing", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection badge="Capabilities" title="Everything in one workflow" description="From strategy to published article — without switching tools.">
        <FeatureGrid items={FEATURES} />
      </MarketingSection>

      <MarketingSection
        title="A clear path from research to publish"
        description="Keep the speed of assisted drafting without giving up editorial judgment."
        bordered
      >
        <div className="grid md:grid-cols-3 gap-6">
          {WORKFLOW_STEPS.map((item) => (
            <div key={item.step} className="paper-card rounded-2xl p-6 h-full">
              <div className="text-3xl font-bold text-primary mb-3">{item.step}</div>
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <DarkCTABand
        badge="Free to start"
        title="Ready to test your first workflow?"
        description="Create your account, tell the agent what you want, and start building publish-ready articles."
        primaryCta={{ label: "Start free", href: "/signup" }}
        secondaryCta={{ label: "Compare plans", href: "/pricing" }}
      />

      <FAQAccordion
        items={[
          {
            question: "Do I need a developer to connect my CMS?",
            answer: "No — WordPress, Shopify, Notion, and others connect via native APIs or our plugins in minutes.",
          },
          {
            question: "Can I use my own AI API key?",
            answer: "Yes. Bring your Gemini key for cost control, or use the platform key included in your plan.",
          },
          {
            question: "What's included in the free tier?",
            answer: "Roadmap generator, basic GEO audit, and limited content generation — no credit card required.",
          },
        ]}
      />

      <MarketingCTA
        title="Put the next decision in writing."
        description="Start with a roadmap you can inspect, edit, and turn into work—not another dashboard full of suggestions."
        secondaryHref="/geo-audit"
        secondaryLabel="Or run a free GEO audit →"
      />
    </MarketingPageShell>
  );
}
