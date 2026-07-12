"use client";

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
import { cardSurfaceClass } from "@/lib/marketing-surfaces";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

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
];

const glassCard = cardSurfaceClass("glass");

export function HomeMarketingSections() {
  return (
    <>
      <MarketingSection
        variant="image"
        backgroundImage={HERO_IMAGES.home.workflow}
        bridgeTop
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
              desc: "Set the audience, search intent, angle, evidence, and brand voice before a draft is written. Edit every output before it goes live.",
            },
            {
              icon: LayoutGrid,
              title: "Plan the next 30 days",
              desc: "Prioritize topics using your site, competitors, and tracked queries. Each item has an owner, format, and reason to exist.",
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
              desc: "Connect your CMS or social accounts once. Keep one review process across every destination.",
            },
            {
              icon: GitBranch,
              title: "Use your existing CMS",
              desc: "Publish to WordPress, Shopify, Notion, Ghost, and more — via native APIs or goals.ac plugins.",
            },
            {
              icon: Key,
              title: "Technical visibility audit",
              desc: "Find missing schema, weak metadata, and page structure that hurts retrieval or citation.",
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

      <MarketingSection
        variant="paper"
        bordered
        titleLine1="A clear path"
        titleLine2="from research to publish"
        description="Keep the speed of assisted drafting without giving up editorial judgment or control."
        className="py-24 bg-background"
      >
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Tell us your brand",
              desc: "Add your market, audience, positioning, voice, and current site.",
            },
            {
              step: "02",
              title: "Plan and draft",
              desc: "Choose a priority, review the brief, and produce a draft with structure and metadata.",
            },
            {
              step: "03",
              title: "Review, publish, measure",
              desc: "Approve the work, send it to your CMS, and track rankings and citations.",
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

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
        items={[
          {
            question: "Is the roadmap generator really free?",
            answer:
              "Yes — fully free, no signup required. The full AI content engine requires a free account.",
          },
          {
            question: "How is this different from a content agency?",
            answer:
              "Agencies cost $5K–$15K/month and take weeks per piece. goals.ac generates brand-aligned content in minutes at a fraction of the price.",
          },
          {
            question: "What's a GEO audit?",
            answer:
              "GEO (Generative Engine Optimization) scans your site for gaps that hurt visibility in ChatGPT, Perplexity, Google AI, and others.",
          },
        ]}
      />

      <DarkCTABand
        badge="Free with signup"
        titleLine1="Continue from roadmap"
        titleLine2="to execution"
        description="Save your roadmap, inspect competitors, track search queries, and turn priorities into briefs and drafts."
        animatedBackground
        primaryCta={{ label: "Create free account", href: "/signup" }}
        secondaryCta={{ label: "Sign in", href: "/login" }}
      >
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {[
            {
              icon: Search,
              title: "Competitor Analysis",
              desc: "Compare topics, positioning, and content gaps.",
            },
            {
              icon: BarChart3,
              title: "Keyword Tracking",
              desc: "Track target queries, positions, and assigned pages.",
            },
            {
              icon: MessageSquare,
              title: "Roadmap Q&A",
              desc: "Ask questions against your roadmap context.",
            },
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
        titleLine1="Put the next"
        titleLine2="decision in writing"
        description="Start with a roadmap you can inspect, edit, and turn into work—not another dashboard full of suggestions."
        variant="image"
        backgroundImage={HERO_IMAGES.home.cta}
        secondaryHref="/geo-audit"
        secondaryLabel="Or run a free GEO audit →"
      />
    </>
  );
}
