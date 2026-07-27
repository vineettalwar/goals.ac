"use client";

import Link from "next/link";
import { ArrowRight, Clock, ExternalLink, TrendingUp } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { ARTICLE_QUALITY_DEMO_SCORE } from "@/lib/marketing/content/article-quality-demo";
import { DEFAULT_VERIFY_LINKS, type SuccessStory } from "@/lib/marketing/content/success-stories";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass");
const glassCardStatic = cardSurfaceClass("glass", false);

export type PublicArticleExample = {
  id: number;
  title: string;
  primaryKeyword: string;
  wordCount: number;
};

type Props = {
  articles: PublicArticleExample[];
  publishedStories: SuccessStory[];
};

export function SuccessStoriesPageClient({ articles, publishedStories }: Props) {
  const hasPublished = publishedStories.length > 0;

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge={hasPublished ? "Customer stories" : "Results"}
          titleLine1={hasPublished ? "Customer" : "Customer"}
          titleLine2={hasPublished ? "stories" : "stories"}
          description={
            hasPublished
              ? "Permissioned results with primary-source verify links — Search Console, Ahrefs, ChatGPT."
              : "Named customer stories will appear here when we have permission to publish them. Until then, try the product demos below."
          }
          backgroundImage={HERO_IMAGES.roadmaps.hero}
          ctas={[
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" },
            { label: "Content Studio", href: "/content-engine", variant: "ghost" },
          ]}
        />
      }
    >
      {hasPublished ? (
        <MarketingSection bordered className="py-16" titleLine1="Published" titleLine2="results">
          <div className="grid md:grid-cols-2 gap-6">
            {publishedStories.map((story) => (
              <Link
                key={story.slug}
                href={`/success-stories/${story.slug}`}
                className={`${glassCard} p-6 block hover:bg-white/[0.07] transition-colors`}
              >
                <p className="text-[11px] text-white/55 mb-2">
                  {story.vertical} · {story.companyLabel}
                </p>
                <h3 className="font-bold text-lg mb-2 text-white">{story.title}</h3>
                <p className="text-sm text-white/65 line-clamp-3">{story.summary}</p>
              </Link>
            ))}
          </div>
        </MarketingSection>
      ) : (
        <MarketingSection bordered className="py-16" titleLine1="How we will" titleLine2="report results">
          <div className={`${glassCardStatic} p-6 mb-10 max-w-2xl flex gap-4 items-start`}>
            <Clock className="h-5 w-5 text-(--accent-warm) shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-medium text-white mb-1">No published stories yet</p>
              <p className="text-sm text-white/65 leading-relaxed">
                We only list results we can verify and that a client has cleared for publish. Use the
                demos below to see the product in the meantime.
              </p>
            </div>
          </div>

          <div className={`${glassCardStatic} p-6 md:p-8 max-w-2xl`}>
            <h3 className="font-bold text-lg mb-2 text-white">Tools we will cite</h3>
            <p className="text-sm text-white/55 mb-5">
              Same primary sources for organic and AI visibility. Open them yourself.
            </p>
            <div className="flex flex-wrap gap-3">
              {DEFAULT_VERIFY_LINKS.map((link) => (
                <a
                  key={link.href + link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </a>
              ))}
            </div>
          </div>
        </MarketingSection>
      )}

      <MarketingSection bordered className="py-16" titleLine1="What you can" titleLine2="try today">
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
            {articles.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {articles.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <Link href={`/seo-article/${a.id}`} className="text-sm text-primary hover:underline line-clamp-1">
                      {a.title}
                    </Link>
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

      <MarketingSection bordered className="py-16" titleLine1="See the" titleLine2="product">
        <p className="text-white/65 mb-6 max-w-xl">
          Sign up free for a walkthrough of the studio, or book a call if you want a partner demo.
        </p>
        <Link
          href={PRODUCT_CTA_HREF}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {PRODUCT_CTA_PRIMARY} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href={CONTACT_HREF} className="inline-flex items-center gap-1 text-sm text-white/65 mt-4 ml-0 sm:ml-4 hover:underline">
          Or {CONTACT_CTA_LABEL.toLowerCase()}
        </Link>
      </MarketingSection>
    </MarketingPageShell>
  );
}
