"use client";

import Link from "next/link";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

const SKILL_DOC = `Voice
- Direct. Short sentences. No "leverage" or "synergy."
- Founder talking to a peer, not a vendor pitch.

Never
- Fake urgency ("limited time")
- Invented customer quotes

Glossary
- "desk" = the content workflow, not furniture
- "Action Queue" = GSC-grounded next work`;

const RETRIEVED = [
  {
    source: "About · /about",
    passage:
      "We write for operators who already know the category. Skip the 400-word preamble.",
  },
  {
    source: "Blog · /blog/pipeline-forecasting",
    passage:
      "Forecast confidence beats activity metrics. Name the stage, then the risk.",
  },
];

export function BrandVoiceShowcase() {
  return (
    <MarketingSection
      bordered
      className="py-16"
      badge="In the product"
      titleLine1="Skill doc in,"
      titleLine2="passages out"
      description="Scrape builds an editable markdown guide. At draft time we retrieve a few on-topic passages — not a vibe slider."
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-start">
        <div className="min-w-0 border border-border bg-background">
          <div className="border-b border-border px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            brand-voice.md · editable
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {SKILL_DOC}
          </pre>
        </div>

        <div className="min-w-0 space-y-6">
          <p className="text-sm text-muted-foreground">
            For keyword <span className="font-medium text-foreground">pipeline forecasting</span>,
            retrieval might surface:
          </p>
          <ul className="space-y-5">
            {RETRIEVED.map((item) => (
              <li key={item.source} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {item.source}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{item.passage}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Studio and SEO Chat both read this. You can paste overrides, edit the skill, or re-ingest from
            sitemap / CMS when the site changes.
          </p>
          <Link
            href={PRODUCT_CTA_HREF}
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {PRODUCT_CTA_PRIMARY}
          </Link>
        </div>
      </div>
    </MarketingSection>
  );
}
