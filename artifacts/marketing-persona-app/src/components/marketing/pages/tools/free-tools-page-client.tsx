"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { DarkCTABand } from "@/components/marketing/sections/dark-cta-band";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { FREE_TOOLS, freeToolPath } from "@/lib/marketing/site/free-tools";

type ToolLink = {
  id: string;
  title: string;
  desc: string;
  href: string;
};

const FEATURED: ToolLink[] = [
  {
    id: "geo-audit",
    title: "GEO Audit",
    desc: "Technical scan for AI search visibility.",
    href: "/geo-audit",
  },
  {
    id: "article-quality",
    title: "Article Quality Score",
    desc: "Live /100 breakdown on a sample article.",
    href: "/article-quality",
  },
];

const CHECKERS: ToolLink[] = [
  {
    id: "meta-checker",
    title: FREE_TOOLS["meta-checker"].title,
    desc: FREE_TOOLS["meta-checker"].shortDesc,
    href: freeToolPath("meta-checker"),
  },
  {
    id: "llms-txt",
    title: FREE_TOOLS["llms-txt"].title,
    desc: FREE_TOOLS["llms-txt"].shortDesc,
    href: freeToolPath("llms-txt"),
  },
  {
    id: "robots",
    title: FREE_TOOLS["robots-txt"].title,
    desc: FREE_TOOLS["robots-txt"].shortDesc,
    href: freeToolPath("robots-txt"),
  },
  {
    id: "sitemap",
    title: FREE_TOOLS["sitemap-checker"].title,
    desc: FREE_TOOLS["sitemap-checker"].shortDesc,
    href: freeToolPath("sitemap-checker"),
  },
  {
    id: "serp-preview",
    title: FREE_TOOLS["serp-preview"].title,
    desc: FREE_TOOLS["serp-preview"].shortDesc,
    href: freeToolPath("serp-preview"),
  },
];

function ToolRow({ tool }: { tool: ToolLink }) {
  return (
    <li>
      <Link
        id={tool.id}
        href={tool.href}
        className="group flex items-start justify-between gap-8 py-6 scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white tracking-tight group-hover:text-(--accent-warm) transition-colors">
            {tool.title}
          </h3>
          <p className="text-sm text-white/75 mt-1.5 leading-relaxed">{tool.desc}</p>
        </div>
        <ArrowRight
          className="h-4 w-4 shrink-0 mt-1.5 text-white/60 group-hover:text-(--accent-warm) group-hover:translate-x-0.5 transition-all"
          aria-hidden
        />
      </Link>
    </li>
  );
}

function ToolGroup({ heading, tools }: { heading: string; tools: ToolLink[] }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-white/70 mb-3">{heading}</h2>
      <ul className="divide-y divide-white/10 border-y border-white/10">
        {tools.map((tool) => (
          <ToolRow key={tool.id} tool={tool} />
        ))}
      </ul>
    </div>
  );
}

export function FreeToolsPageClient() {
  return (
    <MarketingPageShell
      overlap={false}
      hero={
        <PageHero
          badge="Free tools"
          titleLine1="SEO & GEO"
          titleLine2="free tools"
          description="No account required. Run audits and previews, then book a call if you want help beyond the free tools."
          backgroundImage={HERO_IMAGES.geoAudit.hero}
          ctas={[{ label: "Browse tools", href: "#tools", variant: "primary" }]}
        />
      }
    >
      <section
        id="tools"
        className="py-16 sm:py-20 relative overflow-hidden text-white bg-black border-t border-white/10"
      >
        <div className="relative z-20 max-w-5xl mx-auto px-6">
          <div className="mx-auto max-w-2xl space-y-14">
            <ToolGroup heading="Start here" tools={FEATURED} />
            <ToolGroup heading="Checkers & generators" tools={CHECKERS} />
          </div>
        </div>
      </section>

      <DarkCTABand
        titleLine1="Need more than"
        titleLine2="a free check?"
        description="Generate briefs, drafts, and CMS-ready articles in the studio — same stack these tools preview."
        primaryCta={{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF }}
      />
    </MarketingPageShell>
  );
}
