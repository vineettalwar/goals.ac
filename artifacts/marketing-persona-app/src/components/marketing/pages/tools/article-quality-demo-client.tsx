"use client";

import { marked } from "marked";
import { ArticleQualityPanel } from "@/components/content/article-quality-panel";
import { ScoreRing } from "@/components/content/score-ring";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import {
  CONTACT_CTA_LABEL,
  CONTACT_HREF,
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";
import {
  ARTICLE_QUALITY_DEMO,
  HUMANIZE_DEMO_METRICS,
} from "@/lib/marketing/content/article-quality-demo";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);

function demoMarkdownToHtml(markdown: string): string {
  // marked handles GFM tables / code; the old regex path left pipe tables as raw text.
  return sanitizeHtml(marked.parse(markdown, { async: false }) as string);
}

type HumanizeColumnProps = {
  label: string;
  accent: "before" | "after";
  markdown: string;
  tellCount: number;
  qualityTotal: number;
  humanVoiceScore: number;
  humanVoiceMax: number;
  humanVoiceDetail: string;
};

function HumanizeColumn({
  label,
  accent,
  markdown,
  tellCount,
  qualityTotal,
  humanVoiceScore,
  humanVoiceMax,
  humanVoiceDetail,
}: HumanizeColumnProps) {
  const isAfter = accent === "after";
  const tellLabel = tellCount === 0 ? "No AI tells" : `${tellCount} AI tell${tellCount === 1 ? "" : "s"}`;

  return (
    <div
      className={`${glassCard} p-5 space-y-4 ${
        isAfter ? "border-emerald-500/30 ring-1 ring-emerald-500/20" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
              isAfter ? "text-emerald-400" : "text-white/70"
            }`}
          >
            {label}
          </p>
          <p
            className={`text-sm font-medium ${
              isAfter ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {tellLabel}
          </p>
          <p className="text-xs text-white/70 mt-1">
            Human voice {humanVoiceScore}/{humanVoiceMax}
            {humanVoiceDetail ? ` · ${humanVoiceDetail}` : ""}
          </p>
        </div>
        <div className="shrink-0 [&_span]:text-white [&_.text-muted-foreground]:text-white/70 [&_.text-secondary]:text-white/40">
          <ScoreRing score={qualityTotal} size={72} label="Quality" />
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto marketing-prose-dark text-sm leading-relaxed border-t border-white/10 pt-4">
        <div dangerouslySetInnerHTML={{ __html: demoMarkdownToHtml(markdown) }} />
      </div>
    </div>
  );
}

export function ArticleQualityDemoClient() {
  const demo = ARTICLE_QUALITY_DEMO;
  const metrics = HUMANIZE_DEMO_METRICS;

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Quality score"
          titleLine1="See the article"
          titleLine2="score breakdown"
          description="Each draft gets a /100 score you can open: structure, citations, FAQ, schema, internal links. Not a black-box autopilot."
          backgroundImage={HERO_IMAGES.contentEngine.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "Try free GEO audit", href: "/geo-audit", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection
        bordered
        className="py-16"
        titleLine1="Sample article"
        titleLine2="scored live"
        description="Same rubric as the content editor. Compare it to the scorecards autopilot SEO tools publish."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className={`${glassCard} p-5 space-y-4`}>
              <p className="marketing-section-label text-white/70">
                How we tailored this for {demo.brandName}
              </p>
              <div>
                <p className="text-xs text-white/70 mb-2">Brand colors</p>
                <div className="flex gap-2">
                  {demo.brandColors.map((color) => (
                    <span
                      key={color}
                      className="h-8 w-8 rounded-lg border border-white/10"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-white/70 mb-2">Voice & tone</p>
                <div className="flex flex-wrap gap-2">
                  {demo.voiceTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-white/70 mb-2">Cross-linked offerings</p>
                <div className="flex flex-wrap gap-2">
                  {demo.offerings.map((item) => (
                    <span key={item} className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/80">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <ArticleQualityPanel
              bodyMarkdown={demo.bodyMarkdown}
              metaTitle={demo.metaTitle}
              metaDescription={demo.metaDescription}
              citations={demo.citations}
              faqSection={demo.faqSection}
              jsonLdSchema={demo.jsonLdSchema}
              internalLinkSuggestions={demo.internalLinkSuggestions}
              wordCount={demo.wordCount}
            />
          </div>

          <div className={`${glassCard} p-5 max-h-160 overflow-y-auto marketing-prose-dark`}>
            <p className="text-xs text-white/70 mb-4 not-prose">
              {demo.metaTitle} · {demo.wordCount.toLocaleString()} words
            </p>
            <div dangerouslySetInnerHTML={{ __html: demoMarkdownToHtml(demo.bodyMarkdown) }} />
          </div>
        </div>
      </MarketingSection>

      <MarketingSection
        bordered
        className="py-16"
        titleLine1="Before vs after"
        titleLine2="humanize"
        description={metrics.caption}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <HumanizeColumn
            label="Before · generic AI draft"
            accent="before"
            markdown={demo.beforeMarkdown}
            tellCount={metrics.before.tellCount}
            qualityTotal={metrics.before.qualityTotal}
            humanVoiceScore={metrics.before.humanVoiceScore}
            humanVoiceMax={metrics.before.humanVoiceMax}
            humanVoiceDetail={metrics.before.humanVoiceDetail}
          />
          <HumanizeColumn
            label="After · humanize pass"
            accent="after"
            markdown={demo.afterMarkdown}
            tellCount={metrics.after.tellCount}
            qualityTotal={metrics.after.qualityTotal}
            humanVoiceScore={metrics.after.humanVoiceScore}
            humanVoiceMax={metrics.after.humanVoiceMax}
            humanVoiceDetail={metrics.after.humanVoiceDetail}
          />
        </div>
      </MarketingSection>

      <MarketingCTA
        titleLine1="Want scores"
        titleLine2="on your drafts?"
        description="Sign up and run the same quality scoring on your own drafts in the content studio."
        variant="dark"
        primaryHref={PRODUCT_CTA_HREF}
        primaryLabel={PRODUCT_CTA_PRIMARY}
        secondaryHref={CONTACT_HREF}
        secondaryLabel={CONTACT_CTA_LABEL}
      />
    </MarketingPageShell>
  );
}
