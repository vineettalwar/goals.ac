"use client";

import Link from "next/link";
import { ArrowRight, Clock, TrendingUp } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { WaitlistForm } from "@/components/shared/waitlist-form";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { ARTICLE_QUALITY_DEMO_SCORE } from "@/lib/marketing/content/article-quality-demo";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

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
          badge="Coming soon"
          titleLine1="Customer stories"
          titleLine2="not published yet"
          description="We have not launched client case studies. No named wins, no metrics. Try the demos below or book a walkthrough while early access continues."
          backgroundImage={HERO_IMAGES.roadmaps.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "Content Studio", href: "/content-engine", variant: "ghost" },
          ]}
        />
      }
    >
      <MarketingSection bordered className="py-16" titleLine1="What you can" titleLine2="try today">
        <div className={`${glassCard} p-6 mb-10 max-w-2xl flex gap-4 items-start`}>
          <Clock className="h-5 w-5 text-(--accent-warm) shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-medium text-white mb-1">No success stories published</p>
            <p className="text-sm text-white/65 leading-relaxed">
              goals.ac has not shipped named customer case studies. When real, permissioned stories exist, they will
              appear here with primary-source proof — until then this page stays empty of claims.
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
              <TrendingUp className="h-5 w-5" aria-hidden /> {ARTICLE_QUALITY_DEMO_SCORE}/100
            </Link>
            <p className="text-xs text-white/50 mt-2">Tap to see the full breakdown →</p>
            {articles.length > 0 ? (
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
            ) : null}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Free GEO audit", href: "/geo-audit", desc: "Run a live scan on your URL" },
            { label: "Compare AI SEO tools", href: "/compare/ai-seo-tools", desc: "How we differ from autopilot" },
            { label: "Product roadmap", href: "/product-roadmap", desc: "What's shipped and in beta" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${glassCard} p-5 block hover:bg-white/[0.07] transition-colors`}
            >
              <p className="font-semibold text-white text-sm">{item.label}</p>
              <p className="text-xs text-white/55 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection bordered className="py-16" titleLine1="Early access" titleLine2="waitlist">
        <p className="text-white/65 mb-6 max-w-xl">
          Join the waitlist for early access, or book a demo and we&apos;ll walk through the workflow live.
        </p>
        <WaitlistForm featureKey="success-story" buttonLabel="Join early access waitlist" />
        <Link href={PRODUCT_CTA_HREF} className="inline-flex items-center gap-1 text-sm text-primary mt-8 hover:underline">
          {PRODUCT_CTA_PRIMARY} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href={CONTACT_HREF} className="inline-flex items-center gap-1 text-sm text-white/65 mt-4 hover:underline">
          Or {CONTACT_CTA_LABEL.toLowerCase()}
        </Link>
      </MarketingSection>
    </MarketingPageShell>
  );
}
