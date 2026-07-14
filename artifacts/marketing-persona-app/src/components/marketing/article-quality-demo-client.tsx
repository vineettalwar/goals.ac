"use client";

import Link from "next/link";
import { ArticleQualityPanel } from "@/components/article-quality-panel";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { MarketingCTA } from "@/components/marketing/marketing-cta";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";
import { ARTICLE_QUALITY_DEMO } from "@/lib/marketing/article-quality-demo";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);

export function ArticleQualityDemoClient() {
  const demo = ARTICLE_QUALITY_DEMO;

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Quality score"
          titleLine1="See the article"
          titleLine2="score breakdown"
          description="Every goals.ac draft gets an inspectable quality score — structure, citations, FAQ, schema, and internal links. No black-box autopilot."
          backgroundImage={HERO_IMAGES.contentEngine.hero}
          ctas={[
            { label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF, variant: "primary" },
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
        description="Same rubric used in the content editor — comparable to public scorecards from autopilot SEO tools."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className={`${glassCard} p-5 space-y-4`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                How we tailored this for {demo.brandName}
              </p>
              <div>
                <p className="text-xs text-white/50 mb-2">Brand colors</p>
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
                <p className="text-xs text-white/50 mb-2">Voice & tone</p>
                <div className="flex flex-wrap gap-2">
                  {demo.voiceTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-white/50 mb-2">Cross-linked offerings</p>
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

          <div className="space-y-6">
            <div className={`${glassCard} p-5 max-h-[520px] overflow-y-auto marketing-prose-dark`}>
              <p className="text-xs text-white/50 mb-4 not-prose">
                {demo.metaTitle} · {demo.wordCount.toLocaleString()} words
              </p>
              <div
                dangerouslySetInnerHTML={{
                  __html: demo.bodyMarkdown
                    .replace(/^# (.+)$/m, "<h2>$1</h2>")
                    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
                    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary">$1</a>')
                    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
                    .replace(/\n\n/g, "</p><p>")
                    .replace(/^(.+)$/gm, (line) =>
                      line.startsWith("<") ? line : `<p>${line}</p>`,
                    ),
                }}
              />
            </div>

            <div className={`${glassCard} p-5 space-y-4`}>
              <h3 className="font-semibold text-sm text-white">Humanization pass</h3>
              <p className="text-xs text-white/65">
                Optional second pass rewrites for natural rhythm while preserving headings, keywords, and schema.
              </p>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-semibold uppercase text-white/50 mb-1">Before</p>
                <p className="text-xs text-white/65 italic">{demo.humanizationBefore}</p>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-[10px] font-semibold uppercase text-emerald-400 mb-1">After humanize</p>
                <p className="text-xs text-white/80">{demo.humanizationAfter}</p>
              </div>
            </div>
          </div>
        </div>
      </MarketingSection>

      <MarketingCTA
        titleLine1="Want scores"
        titleLine2="on your drafts?"
        description="Book a discovery call. We'll run autopilot on your site and show quality scores on real articles."
        variant="dark"
        backgroundImage={HERO_IMAGES.contentEngine.footer}
        secondaryHref="/content-autopilot"
        secondaryLabel="Content autopilot →"
      />
    </MarketingPageShell>
  );
}
