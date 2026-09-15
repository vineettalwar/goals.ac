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
    <section ref={sectionRef} className="border-t border-border bg-background py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <EditorialHeading
            line1="Written in your voice"
            description="Every article inherits brand voice, internal links, citations, and a quality score you can inspect."
            theme="light"
          />
        </div>

        <div className={`scroll-reveal ${glassCard} mx-auto max-w-3xl p-8`}>
          <div className="flex flex-col gap-8 sm:flex-row">
            <div className="flex shrink-0 flex-col items-center justify-center">
              <Link href={qualityHref} className="group flex flex-col items-center">
                <div className="relative flex h-25 w-25 items-center justify-center">
                  <svg width={100} height={100} viewBox="0 0 100 100" className="absolute -rotate-90">
                    <circle cx={50} cy={50} r={40} fill="none" stroke="var(--border)" strokeWidth={7} />
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
                    <span className="score-signal text-3xl font-bold group-hover:opacity-80">
                      {score}
                    </span>
                    <span className="block font-mono text-[11px] text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <span className="mt-2 text-sm text-muted-foreground">
                  Sample article score
                </span>
              </Link>
            </div>

            <div className="flex-1 space-y-4">
              <p className="line-clamp-2 text-lg font-semibold text-foreground">{title}</p>
              {article?.primaryKeyword ? (
                <p className="text-sm text-muted-foreground">Primary keyword: {article.primaryKeyword}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Sample: {demo.brandName}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {demo.voiceTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ul className="space-y-1.5 text-base text-muted-foreground">
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
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {article ? "Read full example" : "Open quality demo"} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={PRODUCT_CTA_HREF}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
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
