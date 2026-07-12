"use client";

import Link from "next/link";
import {
  BarChart3,
  Brain,
  Eye,
  Globe,
  LayoutGrid,
  Link2,
  Map,
  MessageSquare,
  Network,
  Search,
  Wallet,
  Wand2,
  Zap,
} from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { DarkCTABand } from "@/components/marketing/dark-cta-band";
import { FAQAccordion } from "@/components/marketing/faq-accordion";
import { VideoDemoSection } from "@/components/marketing/video-demo-section";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { FeatureStatusBadge } from "@/components/feature-status-badge";
import { WaitlistForm } from "@/components/waitlist-form";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

const FEATURES = [
  { icon: Map, title: "12-month growth roadmaps", description: "Free strategic roadmaps — unique vs autopilot-only tools.", href: "/roadmaps" },
  { icon: LayoutGrid, title: "30-day content strategy", description: "Calendar from your roadmap with formats, owners, and rationale.", href: "/content-strategy" },
  { icon: Brain, title: "Content Agent workflow", description: "Goals → topic ideas → angles → articles in one flow.", href: "/content-engine" },
  { icon: Wand2, title: "Humanized long-form articles", description: "1,400–1,800 word drafts with citations, FAQ, and quality scores.", href: "/content-engine" },
  { icon: Zap, title: "Content Autopilot", description: "Daily/weekly queue with manual, draft, or live publish modes.", href: "/content-autopilot" },
  { icon: Globe, title: "CMS publishing", description: "WordPress, Shopify, Drupal, Joomla, Notion, Webflow, Ghost.", href: "/cms-publishing" },
  { icon: Eye, title: "AI visibility tracking", description: "Citation rates across ChatGPT, Perplexity, Claude, Gemini.", href: "/llm-visibility" },
  { icon: Search, title: "GEO audit", description: "Schema, metadata, and structure checks for AI crawlers.", href: "/geo-audit" },
  { icon: Network, title: "Topical authority map", description: "Cluster coverage, gaps, and recommended next articles." },
  { icon: BarChart3, title: "Keyword tracking", description: "SERP positions, content gaps, and rank alerts." },
  { icon: Wallet, title: "BYOK + platform AI", description: "Bring your Gemini key or use platform AI with cost tracking." },
  { icon: Link2, title: "Internal link hub", description: "Site-wide link graph and contextual suggestions — not link schemes.", href: "/link-building" },
];

const COMING_SOON = [
  { title: "AI article hero images", key: "ai-images" },
  { title: "Agency white-label reseller", key: "agency-reseller" },
  { title: "50+ languages", key: "multilingual-50" },
  { title: "Link outreach playbook", key: "link-building-playbook" },
];

const WORKFLOW_STEPS = [
  { step: "01", title: "Set your brand context", desc: "Add market, audience, voice, and CMS connections once." },
  { step: "02", title: "Plan and draft", desc: "Choose priorities, review briefs, and generate structured drafts." },
  { step: "03", title: "Review and publish", desc: "Approve work, push to your CMS, and track AI citations." },
];

export function FeaturesPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Product features"
          titleLine1="Strategy-first"
          titleLine2="AI content platform"
          description="Everything autopilot SEO tools offer — plus roadmaps, editorial control, and white-hat authority building."
          backgroundImage={HERO_IMAGES.features.hero}
          ctas={[
            { label: "Start free", href: "/signup", variant: "primary" },
            { label: "Compare tools", href: "/compare/ai-seo-tools", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection
        variant="image"
        backgroundImage={HERO_IMAGES.features.capabilities}
        bridgeTop
        badge="Capabilities"
        titleLine1="Everything in one"
        titleLine2="workflow"
        description="From 12-month strategy to published article — without switching tools."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, href }) => (
            <div key={title} className="glass-card p-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">{description}</p>
              {href && (
                <Link href={href} className="mt-3 inline-block text-xs text-white/80 hover:text-white underline">
                  Learn more →
                </Link>
              )}
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection variant="paper" bordered className="py-20 bg-background" titleLine1="Beta &" titleLine2="coming soon">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FeatureStatusBadge status="beta" />
              <span className="text-sm font-medium">Ship Lite — live with limits</span>
            </div>
            <FeatureGrid
              surface="paper"
              columns={2}
              items={[
                { icon: Link2, title: "Internal Link Hub", description: "Orphan pages, link suggestions, cluster coverage." },
                { icon: MessageSquare, title: "Reddit Discovery", description: "Thread finder + draft replies. No auto-posting." },
                { icon: Globe, title: "10 languages", description: "Native-quality B2B content in major European languages." },
              ]}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FeatureStatusBadge status="coming-soon" />
              <span className="text-sm font-medium">Join the waitlist</span>
            </div>
            <ul className="space-y-4 mb-6">
              {COMING_SOON.map((item) => (
                <li key={item.key} className="paper-card p-4 text-sm font-medium">{item.title}</li>
              ))}
            </ul>
            <WaitlistForm featureKey="features-roadmap" buttonLabel="Notify me" />
          </div>
        </div>
      </MarketingSection>

      <MarketingSection variant="paper" titleLine1="A clear path" titleLine2="from research to publish" bordered className="py-24 bg-background">
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

      <VideoDemoSection />

      <DarkCTABand
        badge="Free to start"
        titleLine1="Ready to test"
        titleLine2="your first workflow?"
        description="Create your account and start building publish-ready articles with quality scores."
        backgroundImage={HERO_IMAGES.features.cta}
        primaryCta={{ label: "Start free", href: "/signup" }}
        secondaryCta={{ label: "Free tools", href: "/free-tools" }}
      />

      <FAQAccordion
        titleLine1="Common"
        titleLine2="questions"
        items={[
          { question: "Do you use backlink exchange networks?", answer: "No — we focus on internal linking, topical authority, and GEO-ready content." },
          { question: "Can I use my own AI API key?", answer: "Yes. Bring your Gemini key for cost control, or use the platform key." },
          { question: "What's included in the free tier?", answer: "Roadmap generator, basic GEO audit, and limited content generation — no credit card." },
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
