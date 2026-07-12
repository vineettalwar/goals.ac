"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import type { HelpArticle } from "@/lib/help-articles";
import { HERO_IMAGES } from "@/lib/marketing-hero-images";

function renderBold(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-b-${j}`} className="text-foreground font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-p-${j}`}>{part}</span>
    ),
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderBold(text.slice(lastIndex, match.index), `${keyPrefix}-t-${partIndex++}`));
    }
    const href = match[2]!;
    const isExternal = href.startsWith("http");
    parts.push(
      isExternal ? (
        <a
          key={`${keyPrefix}-l-${partIndex++}`}
          href={href}
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[1]}
        </a>
      ) : (
        <Link key={`${keyPrefix}-l-${partIndex++}`} href={href} className="text-primary hover:underline">
          {match[1]}
        </Link>
      ),
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...renderBold(text.slice(lastIndex), `${keyPrefix}-t-${partIndex++}`));
  }

  return parts;
}

export function HelpArticleClient({ article }: { article: HelpArticle }) {
  const blocks = article.body.split("\n\n");
  const titleWords = article.title.split(" ");
  const mid = Math.ceil(titleWords.length / 2);

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Help"
          titleLine1={titleWords.slice(0, mid).join(" ")}
          titleLine2={titleWords.slice(mid).join(" ") || undefined}
          description={article.description}
          backgroundImage={HERO_IMAGES.about.mission}
          ctas={
            article.cta
              ? [{ label: article.cta.label, href: article.cta.href, variant: "primary" as const }]
              : [{ label: "All help articles", href: "/help", variant: "primary" as const }]
          }
        />
      }
    >
      <MarketingSection variant="paper" className="py-16 bg-background">
        <Link
          href="/help"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> All help articles
        </Link>
        <article className="prose prose-neutral max-w-3xl mx-auto">
          {blocks.map((block, i) => {
            if (block.startsWith("```")) {
              const code = block.replace(/^```\n?/, "").replace(/\n?```$/, "");
              return (
                <pre
                  key={i}
                  className="text-sm bg-muted rounded-lg p-4 overflow-x-auto mb-4 font-mono text-foreground"
                >
                  {code}
                </pre>
              );
            }
            return (
              <p key={i} className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                {renderInline(block, `b-${i}`)}
              </p>
            );
          })}
        </article>
        {article.cta ? (
          <div className="max-w-3xl mx-auto mt-12 paper-card p-6 text-center">
            <p className="font-medium mb-4">Next step</p>
            <Link
              href={article.cta.href}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90"
            >
              {article.cta.label}
            </Link>
          </div>
        ) : null}
      </MarketingSection>
    </MarketingPageShell>
  );
}
