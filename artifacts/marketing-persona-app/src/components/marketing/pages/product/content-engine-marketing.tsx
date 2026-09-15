"use client";

import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

const SEO_FORMATS = [
  { name: "Blog Post", range: "900–1,200 words" },
  { name: "Guide", range: "1,400–2,000 words" },
  { name: "Tutorial", range: "1,200–1,600 words" },
  { name: "Pillar Page", range: "2,000–3,000 words" },
  { name: "Whitepaper", range: "1,800–2,500 words" },
  { name: "FAQ Article", range: "8–12 Q&As" },
  { name: "News Article", range: "600–900 words" },
  { name: "Location Page", range: "800–1,200 words" },
  { name: "Comparison", range: "1,400–2,000 words" },
  { name: "Listicle", range: "1,200–1,800 words" },
  { name: "Case Study", range: "1,200–1,800 words" },
] as const;

const PIPELINE_STEPS = [
  {
    title: "Brief",
    desc: "Keywords, competitors, and intent become a brief before generation starts.",
  },
  {
    title: "Draft",
    desc: "Long-form SEO drafts in your brand voice from Content Studio.",
  },
  {
    title: "Review",
    desc: "Humanize pass plus editorial and SERP scores. You approve before live.",
  },
  {
    title: "Publish",
    desc: "Readiness gates, then publish to your CMS. Measure and refresh what slips.",
  },
] as const;

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
        description="Brief, draft, review, publish. Same path whether you click Generate or run Autopilot."
      >
        <ol className="max-w-2xl space-y-8">
          {PIPELINE_STEPS.map(({ title, desc }) => (
            <li key={title}>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/65">{desc}</p>
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
        <ul className="max-w-2xl space-y-4 text-sm leading-relaxed text-white/70">
          <li>Humanize pass strips AI tells while keeping headings and links</li>
          <li>Editorial + SERP scores update as you edit</li>
          <li>Publish readiness blocks sloppy meta, dashes, and structure gaps</li>
        </ul>
        <p className="mt-6 text-sm text-white/55">
          <Link href="/article-quality" className="text-white/85 underline-offset-2 hover:text-white hover:underline">
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
        <ul className="max-w-xl columns-1 gap-x-10 sm:columns-2">
          {SEO_FORMATS.map((format) => (
            <li key={format.name} className="mb-2 break-inside-avoid text-sm text-white/80">
              {format.name}{" "}
              <span className="text-white/45">{format.range}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm leading-relaxed text-white/55">
          Also available via repurpose: LinkedIn, X, email sequences, landing page copy.
        </p>
      </MarketingSection>

      <MarketingSection
        titleLine1="Publish where"
        titleLine2="you already work"
        description="Connect once. Keep one review process. Deep paths for WordPress, Ghost, and Shopify; Basic publish elsewhere."
        bordered
        className="py-20"
      >
        <p className="max-w-2xl text-sm leading-relaxed text-white/70">
          WordPress, Ghost, Shopify (deep). Drupal, Joomla, Notion, Webflow, webhook (Basic). After the article,
          repurpose to LinkedIn, X, Instagram, Facebook, Bluesky, and Mastodon.
        </p>
        <p className="mt-4 text-sm text-white/55">
          See{" "}
          <Link href="/integrations" className="text-white/80 underline-offset-2 hover:text-white hover:underline">
            integrations
          </Link>{" "}
          for destination details.
        </p>
      </MarketingSection>

      <DarkCTABand
        badge="Content Autopilot"
        titleLine1="Cadence with"
        titleLine2="review gates"
        description="Daily or weekly generation on the same Studio path. Manual or draft by default. Live auto-publish is optional."
        primaryCta={{ label: "See Autopilot", href: "/content-autopilot" }}
        secondaryCta={{ label: "Run free GEO audit", href: "/geo-audit" }}
      >
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/65">
          Scheduled queue, scores on every draft, you keep editorial control.
        </p>
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
