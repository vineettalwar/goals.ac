"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { HeroOverlapShell } from "@/components/marketing/heroes/hero-overlap-shell";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import {
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";
import { FREE_TOOLS, FREE_TOOL_LIST, freeToolPath, type FreeToolSlug } from "@/lib/marketing/site/free-tools";
import { FreeToolLlmsGuide } from "./free-tool-llms-guide";
import { SerpPreview } from "./free-tool-serp";
import { UrlTool } from "./free-tool-url-tool";

export function FreeToolPageClient({ slug }: { slug: FreeToolSlug }) {
  const tool = FREE_TOOLS[slug];
  const otherTools = FREE_TOOL_LIST.filter((t) => t.slug !== slug);

  return (
    <MarketingPageShell
      hero={
        <PageHero
          titleLine1={tool.heroLine1}
          titleLine2={tool.heroLine2}
          description={tool.heroDescription}
          backgroundImage={HERO_IMAGES.geoAudit.hero}
          ctas={[
            { label: "Try it below", href: "#tool", variant: "primary" },
            { label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "ghost" },
          ]}
        />
      }
    >
      <HeroOverlapShell id="tool">
        {tool.kind === "client" ? (
          <SerpPreview />
        ) : tool.api ? (
          <UrlTool slug={slug as Exclude<FreeToolSlug, "serp-preview">} api={tool.api} />
        ) : null}
      </HeroOverlapShell>

      {slug === "llms-txt" ? <FreeToolLlmsGuide /> : null}

      <MarketingSection bordered className="py-16">
        <h2 className="text-sm font-medium text-white/70 mb-1">More free tools</h2>
        <ul className="divide-y divide-white/10 border-y border-white/10 max-w-3xl">
          {otherTools.map((other) => (
            <li key={other.slug}>
              <Link
                href={freeToolPath(other.slug)}
                className="group flex items-start justify-between gap-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-(--accent-warm) transition-colors">
                    {other.title}
                  </h3>
                  <p className="text-sm text-white/75 mt-1 leading-relaxed">{other.shortDesc}</p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 mt-1 text-white/60 group-hover:text-(--accent-warm) group-hover:translate-x-0.5 transition-all"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/free-tools"
              className="group flex items-start justify-between gap-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-(--accent-warm) transition-colors">
                  All free tools
                </h3>
                <p className="text-sm text-white/75 mt-1 leading-relaxed">
                  GEO audit, article quality score, and every checker in one place.
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 mt-1 text-white/60 group-hover:text-(--accent-warm) group-hover:translate-x-0.5 transition-all"
                aria-hidden
              />
            </Link>
          </li>
        </ul>
      </MarketingSection>
    </MarketingPageShell>
  );
}
