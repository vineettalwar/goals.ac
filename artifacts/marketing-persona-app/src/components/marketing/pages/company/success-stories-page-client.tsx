"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Clock, ExternalLink, TrendingUp } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { WaitlistForm } from "@/components/shared/waitlist-form";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { ARTICLE_QUALITY_DEMO_SCORE } from "@/lib/marketing/content/article-quality-demo";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { ILLUSTRATIVE_PROFILE, VERIFY_CTAS } from "@/lib/marketing/content/story-kit-constants";

const glassCard = cardSurfaceClass("glass");

export type PublicArticleExample = {
  id: number;
  title: string;
  primaryKeyword: string;
  wordCount: number;
};

type Props = {
  articles: PublicArticleExample[];
};

export function SuccessStoriesPageClient({ articles }: Props) {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Illustrative profile"
          titleLine1="Customer stories"
          titleLine2="honest preview"
          description="No named client case studies published yet. Below is one anonymized illustrative engagement profile with range bands — partners swap in GSC screenshots before going live."
          backgroundImage={HERO_IMAGES.roadmaps.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "Content Studio", href: "/content-engine", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection bordered className="py-16" titleLine1="Illustrative" titleLine2="engagement profile">
        <p className="text-white/65 mb-8 max-w-2xl text-sm leading-relaxed">
          Redacted partner template filled with illustrative ranges only — not a claimed win for a named company.
          When you publish a real story, replace every band with Search Console / GEO / authority screenshots and
          keep the verify links so readers can check the source.
        </p>

        <div className={`${glassCard} p-6 sm:p-8 mb-8`}>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <p className="marketing-section-label text-white/45 mb-2">{ILLUSTRATIVE_PROFILE.framing}</p>
              <h3 className="font-bold text-xl text-white tracking-tight">{ILLUSTRATIVE_PROFILE.headline}</h3>
              <p className="text-sm text-white/55 mt-2 max-w-lg">{ILLUSTRATIVE_PROFILE.summary}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/50 border border-white/15 rounded-md px-2.5 py-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Ranges · not a named case study
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {ILLUSTRATIVE_PROFILE.metrics.map((slot) => (
              <div
                key={slot.label}
                className="rounded-lg border border-dashed border-white/20 bg-white/3 px-4 py-5"
              >
                <p className="text-xs uppercase tracking-[0.08em] text-white/45 font-semibold mb-3">{slot.label}</p>
                <p className="text-3xl font-bold text-white tabular-nums mb-1">{slot.value}</p>
                <p className="text-xs text-white/50 mb-2">{slot.source}</p>
                <p className="text-xs text-white/40 leading-relaxed">{slot.hint}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/3 px-4 py-4 mb-8">
            <p className="text-xs uppercase tracking-[0.08em] text-white/45 font-semibold mb-3">
              Partner: swap in GSC screenshots
            </p>
            <ol className="space-y-2 list-decimal list-inside">
              {ILLUSTRATIVE_PROFILE.partnerSwapSteps.map((step) => (
                <li key={step} className="text-xs text-white/50 leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-[0.08em] text-white/45 font-semibold mb-3">
              Verification CTAs
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              {VERIFY_CTAS.map((cta) => (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/6 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/10 hover:border-white/30 transition-colors"
                >
                  {cta.label}
                  <ExternalLink className="h-3.5 w-3.5 text-white/50" />
                </Link>
              ))}
            </div>
            <ul className="space-y-2">
              {VERIFY_CTAS.map((cta) => (
                <li key={`${cta.label}-desc`} className="text-xs text-white/45 leading-relaxed">
                  <span className="text-white/60 font-medium">{cta.label}:</span> {cta.desc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-white/40 max-w-2xl">
          For partner demos: walk a prospect through this layout, then connect GSC in{" "}
          <Link href="/search-analytics" className="text-primary hover:underline">
            Search analytics
          </Link>{" "}
          so the first published story has verifiable impressions — not illustrative ranges.
        </p>
      </MarketingSection>

      <MarketingSection bordered className="py-16" titleLine1="What you can" titleLine2="try today">
        <div className={`${glassCard} p-6 mb-10 max-w-2xl flex gap-4 items-start`}>
          <Clock className="h-5 w-5 text-(--accent-warm) shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-white mb-1">Named stories still ahead</p>
            <p className="text-sm text-white/65 leading-relaxed">
              The card above is an anonymized illustrative profile only. Named, permissioned case studies land as
              clients approve. Until then, try the free tools and demos below.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className={`${glassCard} p-6`}>
            <h3 className="font-bold text-lg mb-2 text-white">Content Studio</h3>
            <p className="text-sm text-white/65 mb-3">
              Research-backed SEO briefs, drafts you approve, and publishing to CMS and social from one workspace.
            </p>
            <Link href="/content-engine" className="inline-flex items-center gap-1 text-xs text-primary mt-4">
              See how it works →
            </Link>
          </div>
          <div className={`${glassCard} p-6`}>
            <h3 className="font-bold text-lg mb-2 text-white">Article quality demo</h3>
            <p className="text-sm text-white/65 mb-3">
              Sample article scored with the same /100 rubric used in the content editor.
            </p>
            <Link
              href="/article-quality"
              className="inline-flex items-center gap-2 text-emerald-400 font-bold text-2xl hover:text-emerald-300 transition-colors"
            >
              <TrendingUp className="h-5 w-5" /> {ARTICLE_QUALITY_DEMO_SCORE}/100
            </Link>
            <p className="text-xs text-white/50 mt-2">Tap to see the full breakdown →</p>
            {articles.length > 0 && (
              <ul className="mt-4 space-y-2">
                {articles.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <Link href={`/seo-article/${a.id}`} className="text-sm text-primary hover:underline line-clamp-1">
                      {a.title}
                    </Link>
                    <span className="text-xs text-white/50 ml-1">· {a.wordCount} words</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Free GEO audit", href: "/geo-audit", desc: "Run a live scan on your URL" },
            { label: "Compare AI SEO tools", href: "/compare/ai-seo-tools", desc: "How we differ from autopilot" },
            { label: "Product roadmap", href: "/product-roadmap", desc: "What's shipped and in beta" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className={`${glassCard} p-5 block hover:bg-white/[0.07] transition-colors`}>
              <p className="font-semibold text-white text-sm">{item.label}</p>
              <p className="text-xs text-white/55 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection bordered className="py-16" titleLine1="Be first" titleLine2="in our stories">
        <p className="text-white/65 mb-6 max-w-xl">
          Join the waitlist for early access, or book a demo and we&apos;ll walk through the workflow live.
        </p>
        <WaitlistForm featureKey="success-story" buttonLabel="Join early access waitlist" />
        <Link href={PRODUCT_CTA_HREF} className="inline-flex items-center gap-1 text-sm text-primary mt-8 hover:underline">
          {PRODUCT_CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href={CONTACT_HREF} className="inline-flex items-center gap-1 text-sm text-white/65 mt-4 hover:underline">
          Or {CONTACT_CTA_LABEL.toLowerCase()}
        </Link>
      </MarketingSection>
    </MarketingPageShell>
  );
}
