"use client";

import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileSearch,
  Globe,
  GraduationCap,
  HelpCircle,
  LayoutTemplate,
  ListOrdered,
  Newspaper,
  PenLine,
  RefreshCw,
  Scale,
  Send,
  Share2,
  Webhook,
} from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

/** Formats on the default blog_wordpress surface (SEO_LONGFORM_FORMATS). */
const SEO_FORMATS = [
  { icon: BookOpen, name: "Blog Post", range: "900–1,200 words" },
  { icon: GraduationCap, name: "Guide", range: "1,400–2,000 words" },
  { icon: GraduationCap, name: "Tutorial", range: "1,200–1,600 words" },
  { icon: LayoutTemplate, name: "Pillar Page", range: "2,000–3,000 words" },
  { icon: FileSearch, name: "Whitepaper", range: "1,800–2,500 words" },
  { icon: HelpCircle, name: "FAQ Article", range: "8–12 Q&As" },
  { icon: Newspaper, name: "News Article", range: "600–900 words" },
  { icon: Globe, name: "Location Page", range: "800–1,200 words" },
  { icon: Scale, name: "Comparison", range: "1,400–2,000 words" },
  { icon: ListOrdered, name: "Listicle", range: "1,200–1,800 words" },
  { icon: Briefcase, name: "Case Study", range: "1,200–1,800 words" },
] as const;

const PIPELINE_STEPS = [
  {
    step: "01",
    icon: FileSearch,
    title: "Research & brief",
    desc: "Keywords, competitors, and intent become a brief before generation starts.",
  },
  {
    step: "02",
    icon: PenLine,
    title: "Draft",
    desc: "Long-form SEO drafts in your brand voice from Content Studio.",
  },
  {
    step: "03",
    icon: RefreshCw,
    title: "Humanize & score",
    desc: "Humanize pass plus dual editorial and SERP scores in the writing room.",
  },
  {
    step: "04",
    icon: Send,
    title: "Review & publish",
    desc: "Readiness gates, then publish to your CMS. You approve before live.",
  },
] as const;

const glassCard = cardSurfaceClass("glass");

export function ContentEngineMarketing() {
  const appCta = PRODUCT_CTA_HREF;
  const appLabel = PRODUCT_CTA_PRIMARY;

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Content Studio"
          titleLine1="Research to publish"
          titleLine2="in one workspace"
          description="SEO articles drafted from real briefs, humanized and scored, then published to your CMS with human review. Autopilot is an optional cadence on the same path."
          backgroundImage={HERO_IMAGES.contentEngine.hero}
          ctas={[
            { label: appLabel, href: appCta, variant: "primary" },
            { label: "See article quality", href: "/article-quality", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection
        variant="dark"
        bridgeTop
        titleLine1="The Studio"
        titleLine2="loop"
        description="One numbered path. Not a format catalog with a publish button bolted on."
      >
        <ol className="grid md:grid-cols-2 gap-4">
          {PIPELINE_STEPS.map(({ step, icon: Icon, title, desc }) => (
            <li key={title} className={`${glassCard} p-5`}>
              <div className="flex gap-4">
                <div className="shrink-0">
                  <span className="text-xs font-semibold tracking-wider text-white/45">{step}</span>
                  <div className="mt-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{desc}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </MarketingSection>

      <MarketingSection
        titleLine1="Quality you can"
        titleLine2="inspect"
        description="Humanize before/after, dual scores, and a ready checklist live in the writing room — the same proof we show on the article quality demo."
        bordered
        className="py-20"
      >
        <div className="grid md:grid-cols-3 gap-4">
          {[
            "Humanize pass strips AI tells while keeping headings and links",
            "Editorial + SERP scores update as you edit",
            "Publish readiness blocks sloppy meta, dashes, and structure gaps",
          ].map((label) => (
            <div key={label} className={`${glassCard} p-5 flex items-start gap-3`}>
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/70 leading-relaxed">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-white/55">
          <Link href="/article-quality" className="text-white/85 hover:text-white underline-offset-2 hover:underline">
            Open the article quality demo
          </Link>
        </p>
      </MarketingSection>

      <MarketingSection
        variant="dark"
        titleLine1="SEO formats"
        titleLine2="that ship today"
        description="Default Studio surface: long-form SEO articles. Repurpose to social or email from an approved piece when you need distribution."
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SEO_FORMATS.map((format) => (
            <div
              key={format.name}
              className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
            >
              <format.icon className="h-4 w-4 mt-0.5 shrink-0 text-blue-300" />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight text-white">{format.name}</div>
                <div className="text-[11px] text-white/55 mt-0.5">{format.range}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-white/55 leading-relaxed">
          Also available via repurpose / full surface: LinkedIn, X, email sequences, landing page copy, and more.
        </p>
      </MarketingSection>

      <MarketingSection
        titleLine1="Publish where"
        titleLine2="you already work"
        description="Connect once. Keep one review process. Deep paths for WordPress, Ghost, and Shopify; Basic publish elsewhere."
        bordered
        className="py-20"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-5">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg text-white">CMS &amp; site publishing</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {["WordPress (deep)", "Ghost (deep)", "Shopify (deep)", "Drupal", "Joomla", "Notion", "Webflow", "Webhook"].map(
                (name) => (
                  <div
                    key={name}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-medium text-white"
                  >
                    {name}
                  </div>
                ),
              )}
            </div>
            <p className="mt-4 text-xs text-white/55 leading-relaxed">
              See{" "}
              <Link href="/integrations" className="text-white/80 hover:text-white underline-offset-2 hover:underline">
                integrations
              </Link>{" "}
              for Basic publish badges on thinner stacks.
            </p>
          </div>
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-5">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg text-white">After the article</h3>
            </div>
            <p className="text-sm text-white/65 leading-relaxed mb-4">
              Repurpose approved articles to LinkedIn, X, Instagram, Facebook, Bluesky, and Mastodon — or send HMAC-signed JSON via webhook.
            </p>
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-2.5 flex items-start gap-2 text-xs text-white/65">
              <Webhook className="h-4 w-4 mt-0.5 shrink-0" />
              Distribution is secondary to the SEO article loop, not the hero SKU.
            </div>
          </div>
        </div>
      </MarketingSection>

      <DarkCTABand
        badge="Content Autopilot"
        titleLine1="Cadence with"
        titleLine2="review gates"
        description="Daily or weekly generation on the same Studio path. Manual or draft by default. Live auto-publish is optional."
        primaryCta={{ label: "See Autopilot", href: "/content-autopilot" }}
        secondaryCta={{ label: "Run free GEO audit", href: "/geo-audit" }}
      >
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            "Scheduled queue, not black-box spam",
            "Quality scores on every queued draft",
            "You keep editorial control",
          ].map((label) => (
            <div
              key={label}
              className="glass-card glass-card-hover rounded-2xl p-5 flex items-start gap-4"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/70 leading-relaxed">{label}</p>
            </div>
          ))}
        </div>
      </DarkCTABand>

      <MarketingCTA
        titleLine1="Draft, humanize, score,"
        titleLine2="then publish"
        description="Sign up free and run the Content Studio loop on your first keyword."
        variant="dark"
        primaryHref={appCta}
        primaryLabel={appLabel}
        secondaryHref="/article-quality"
        secondaryLabel="← See article quality demo"
      />
    </MarketingPageShell>
  );
}
