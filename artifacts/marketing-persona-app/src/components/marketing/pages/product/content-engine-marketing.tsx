"use client";

import {
  BookOpen,
  CheckCircle2,
  Globe,
  GraduationCap,
  HelpCircle,
  ImageIcon,
  LayoutTemplate,
  Linkedin,
  Mail,
  Megaphone,
  MonitorPlay,
  Newspaper,
  Package,
  Radio,
  Share2,
  Twitter,
  Webhook,
  FileSearch,
} from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

const FORMAT_CATEGORIES = [
  {
    label: "Long-form Articles",
    color: "text-blue-300",
    formats: [
      { icon: BookOpen, name: "Blog Post", range: "900–1,200 words" },
      { icon: Newspaper, name: "News Article", range: "600–900 words" },
      { icon: GraduationCap, name: "Tutorial", range: "1,200–1,600 words" },
      { icon: FileSearch, name: "Whitepaper", range: "1,800–2,500 words" },
      { icon: LayoutTemplate, name: "Pillar Page", range: "2,000–3,000 words" },
      { icon: Globe, name: "Location Page", range: "800–1,200 words" },
      { icon: ImageIcon, name: "Infographic Outline", range: "400–600 words" },
    ],
  },
  {
    label: "Social Media",
    color: "text-sky-300",
    formats: [
      { icon: Linkedin, name: "LinkedIn Post", range: "1,300–1,800 chars" },
      { icon: Twitter, name: "Twitter / X Thread", range: "9 tweets" },
    ],
  },
  {
    label: "Email & Ads",
    color: "text-violet-300",
    formats: [
      { icon: Mail, name: "Email Sequence", range: "3 emails" },
      { icon: Megaphone, name: "Ad Copy", range: "Google + Meta" },
    ],
  },
  {
    label: "Web Copy",
    color: "text-amber-300",
    formats: [
      { icon: MonitorPlay, name: "Landing Page Copy", range: "600–900 words" },
      { icon: Package, name: "Product Description", range: "300–500 words" },
      { icon: Radio, name: "Press Release", range: "500–700 words" },
      { icon: HelpCircle, name: "FAQ / Knowledge Base", range: "8–12 Q&As" },
    ],
  },
];

const glassCard = cardSurfaceClass("glass");

export function ContentEngineMarketing() {
  const appCta = PRODUCT_CTA_HREF;
  const appLabel = PRODUCT_CTA_PRIMARY;

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Content Studio"
          titleLine1="Draft, review, and publish"
          titleLine2="from one workspace"
          description="Blog posts, guides, social posts, and landing page copy — researched for SEO, written in your voice, and published across CMS, social, and email from one workspace."
          backgroundImage={HERO_IMAGES.contentEngine.hero}
          ctas={[
            { label: appLabel, href: appCta, variant: "primary" },
            { label: "Learn more", href: "/pricing", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection
        variant="dark"
        bridgeTop
        titleLine1="18 formats across"
        titleLine2="four categories"
        description="Long-form articles, social posts, email sequences, and web copy. Repurpose any piece into another format from the same project."
      >
        <div className="grid md:grid-cols-2 gap-5">
          {FORMAT_CATEGORIES.map((category) => (
            <div key={category.label} className={`${glassCard} p-5`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${category.color}`}>
                {category.label}
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {category.formats.map((format) => (
                  <div
                    key={format.name}
                    className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
                  >
                    <format.icon className={`h-4 w-4 mt-0.5 shrink-0 ${category.color}`} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight text-white">{format.name}</div>
                      <div className="text-[11px] text-white/55 mt-0.5">{format.range}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection
        titleLine1="Publish everywhere"
        titleLine2="you work"
        description="Connect your CMS and social accounts once. Keep one review process across every destination."
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
              {["WordPress", "Shopify", "Drupal", "Joomla", "Notion", "Webflow", "Ghost", "Webhook"].map(
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
          </div>
          <div className={`${glassCard} p-6`}>
            <div className="flex items-center gap-2 mb-5">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg text-white">Social publishing</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm mb-4">
              {["LinkedIn", "X / Twitter", "Instagram", "Facebook", "Bluesky", "Mastodon"].map((name) => (
                <div
                  key={name}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-medium text-white"
                >
                  {name}
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-2.5 flex items-start gap-2 text-xs text-white/65">
              <Webhook className="h-4 w-4 mt-0.5 shrink-0" />
              Webhook connector sends HMAC-signed JSON to Zapier, Make, n8n, or your own endpoint.
            </div>
          </div>
        </div>
      </MarketingSection>

      <DarkCTABand
        badge="GEO ready"
        titleLine1="Built for search engines"
        titleLine2="and AI citations"
        description="Drafts include structured headings, schema markup, and clear answers to common questions."
        primaryCta={{ label: "Run a free GEO audit", href: "/geo-audit" }}
      >
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            "Structured headings and FAQ blocks in every long-form draft",
            "Schema.org JSON-LD generated with each article",
            "GEO audit checks for meta tags, schema, and llms.txt",
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
        titleLine1="Plan topics, draft content,"
        titleLine2="publish without switching tools"
        description="Sign up free and start publishing research-driven content across your CMS and social channels."
        variant="dark"
        primaryHref={appCta}
        primaryLabel={appLabel}
        secondaryHref="/article-quality"
        secondaryLabel="← See article quality demo"
      />
    </MarketingPageShell>
  );
}
