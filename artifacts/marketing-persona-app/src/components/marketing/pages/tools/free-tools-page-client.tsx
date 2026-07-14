"use client";

import Link from "next/link";
import { ArrowRight, FileSearch, Globe, Map, Search, Type, type LucideIcon } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { FREE_TOOLS, freeToolPath } from "@/lib/marketing/site/free-tools";

const glassCardHover = cardSurfaceClass("glass");

type ToolCard = {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
};

const TOOLS: ToolCard[] = [
  { id: "geo-audit", icon: Search, title: "GEO Audit", desc: "Full technical scan for AI search visibility.", href: "/geo-audit" },
  { id: "article-quality", icon: Type, title: "Article Quality Score", desc: "See the live /100 breakdown on a sample article.", href: "/article-quality" },
  { id: "meta-checker", icon: FileSearch, title: FREE_TOOLS["meta-checker"].title, desc: FREE_TOOLS["meta-checker"].shortDesc, href: freeToolPath("meta-checker") },
  { id: "llms-txt", icon: Globe, title: FREE_TOOLS["llms-txt"].title, desc: FREE_TOOLS["llms-txt"].shortDesc, href: freeToolPath("llms-txt") },
  { id: "robots", icon: Map, title: FREE_TOOLS["robots-txt"].title, desc: FREE_TOOLS["robots-txt"].shortDesc, href: freeToolPath("robots-txt") },
  { id: "sitemap", icon: Map, title: FREE_TOOLS["sitemap-checker"].title, desc: FREE_TOOLS["sitemap-checker"].shortDesc, href: freeToolPath("sitemap-checker") },
  { id: "serp-preview", icon: Type, title: FREE_TOOLS["serp-preview"].title, desc: FREE_TOOLS["serp-preview"].shortDesc, href: freeToolPath("serp-preview") },
];

export function FreeToolsPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Free tools"
          titleLine1="SEO & GEO"
          titleLine2="free tools"
          description="No account required. Run audits and previews, then book a call if you want help beyond the free tools."
          backgroundImage={HERO_IMAGES.geoAudit.hero}
          ctas={[{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" }]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => (
            <Link key={tool.id} id={tool.id} href={tool.href} className={`${glassCardHover} p-6 block group scroll-mt-24`}>
              <tool.icon className="h-8 w-8 text-(--accent-warm) mb-3" />
              <h3 className="font-semibold text-white group-hover:text-(--accent-warm) transition-colors">{tool.title}</h3>
              <p className="text-sm text-white/65 mt-1">{tool.desc}</p>
              <span className="inline-flex items-center gap-1 text-xs text-(--accent-warm) mt-3">
                Open tool <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
