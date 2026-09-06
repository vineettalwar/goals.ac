"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import {
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import {
  ARTICLE_QUALITY_DEMO,
  ARTICLE_QUALITY_DEMO_SCORE,
} from "@/lib/marketing/content/article-quality-demo";
import type { ShowcaseArticle } from "./home-marketing-sections";

const glassCard = cardSurfaceClass("glass");

type ArticleExampleSectionProps = {
  article?: ShowcaseArticle | null;
};

export function ArticleExampleSection({ article }: ArticleExampleSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  const demo = ARTICLE_QUALITY_DEMO;
  const score = ARTICLE_QUALITY_DEMO_SCORE;
  const title = article?.title ?? demo.metaTitle;
  const wordCount = article?.wordCount ?? demo.wordCount;
  const articleHref = article ? `/seo-article/${article.id}` : "/article-quality";
  const qualityHref = "/article-quality";
  const h2Count = (demo.bodyMarkdown.match(/^## /gm) ?? []).length;
  const citationCount = demo.citations.length;
  const internalLinkCount = demo.internalLinkSuggestions.length;

  return (
    <section ref={sectionRef} className="py-24 bg-black border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-14">
          <EditorialHeading
            line1="Written in"
            line2="your voice"
            description="Every article inherits brand voice, internal links, citations, and a quality score you can inspect."
            theme="dark"
          />
        </div>

        <div className={`scroll-reveal ${glassCard} p-8 max-w-3xl mx-auto`}>
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col items-center justify-center shrink-0">
              <Link href={qualityHref} className="group flex flex-col items-center">
                <div className="relative h-25 w-25 flex items-center justify-center">
                  <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90 absolute">
                    <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth={7} />
                    <circle
                      cx={50}
                      cy={50}
                      r={40}
                      fill="none"
                      stroke="var(--accent-warm)"
                      strokeWidth={7}
                      strokeDasharray={251}
                      strokeDashoffset={251 - (score / 100) * 251}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-white group-hover:text-(--accent-warm) transition-colors">
                      {score}
                    </span>
                    <span className="block text-xs text-white/50">/ 100</span>
                  </div>
                </div>
                <span className="text-sm text-white/50 mt-2 group-hover:text-white/70 transition-colors">
                  Sample article score
                </span>
              </Link>
            </div>

            <div className="flex-1 space-y-4">
              <p className="text-lg font-semibold text-white line-clamp-2">{title}</p>
              {article?.primaryKeyword ? (
                <p className="text-sm text-white/50">Primary keyword: {article.primaryKeyword}</p>
              ) : (
                <p className="text-sm text-white/50">Sample: {demo.brandName}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {demo.voiceTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-white/65"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ul className="text-base text-white/65 space-y-1.5">
                <li>
                  {h2Count} H2 sections and FAQ
                </li>
                <li>
                  {citationCount} citations and {internalLinkCount} internal links
                </li>
                <li>JSON-LD schema and optimized meta</li>
                <li>{wordCount.toLocaleString()} words</li>
              </ul>
              <div className="flex flex-wrap gap-4">
                <Link
                  href={articleHref}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-(--accent-warm) hover:text-white transition-colors"
                >
                  {article ? "Read full example" : "Open quality demo"} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={PRODUCT_CTA_HREF}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  {PRODUCT_CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
