"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileSearch, Globe, Map, Search, Type } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);
const glassCardHover = cardSurfaceClass("glass");

const TOOLS = [
  { id: "geo-audit", icon: Search, title: "GEO Audit", desc: "Full technical scan for AI search visibility.", href: "/geo-audit", live: true },
  { id: "article-quality", icon: Type, title: "Article Quality Score", desc: "See the live /100 breakdown on a sample article.", href: "/article-quality", live: true },
  { id: "meta-checker", icon: FileSearch, title: "Meta Description Checker", desc: "Score your title and meta description.", api: "/api/tools/meta-checker" },
  { id: "llms-txt", icon: Globe, title: "llms.txt Generator", desc: "Generate an llms.txt template from your site.", api: "/api/tools/llms-txt" },
  { id: "robots", icon: Map, title: "Robots.txt Checker", desc: "Parse robots.txt and flag blocking rules.", api: "/api/tools/robots" },
  { id: "sitemap", icon: Map, title: "Sitemap Checker", desc: "Validate your sitemap.xml URL count.", api: "/api/tools/sitemap" },
  { id: "serp-preview", icon: Type, title: "SERP Snippet Preview", desc: "Preview how your title and description appear in Google.", client: true },
];

function SerpPreview() {
  const [title, setTitle] = useState("Your Page Title | Brand Name");
  const [desc, setDesc] = useState("A compelling meta description between 50 and 160 characters that summarizes your page for searchers and AI systems.");

  return (
    <div className={`${glassCard} p-6 space-y-4`}>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" />
      <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Meta description" />
      <div className="rounded-lg border border-white/10 p-4 bg-white">
        <p className="text-[#1a0dab] text-lg leading-snug truncate">{title || "Page title"}</p>
        <p className="text-[#006621] text-xs mt-0.5">https://yoursite.com › page</p>
        <p className="text-sm text-[#4d5156] mt-1 line-clamp-2">{desc || "Meta description preview"}</p>
      </div>
    </div>
  );
}

function UrlTool({ api, title }: { api: string; title: string }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <div className={`${glassCard} p-6 space-y-4`}>
      <h3 className="font-semibold text-white">{title}</h3>
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com" />
        <Button onClick={run} disabled={loading || !url}>{loading ? "…" : "Run"}</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <pre className="text-xs bg-white/5 rounded-lg p-4 overflow-x-auto max-h-64 text-white/80">{result}</pre>}
    </div>
  );
}

export function FreeToolsPageClient() {
  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Free tools"
          titleLine1="SEO & GEO"
          titleLine2="free tools"
          description="No account required. Audit, check, and preview — then contact us for a full engagement."
          backgroundImage={HERO_IMAGES.geoAudit.hero}
          ctas={[{ label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF, variant: "primary" }]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {TOOLS.map((tool) => (
            <div key={tool.id} id={tool.id} className="scroll-mt-24">
              {tool.href ? (
                <Link href={tool.href} className={`${glassCardHover} p-6 block group`}>
                  <tool.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{tool.title}</h3>
                  <p className="text-sm text-white/65 mt-1">{tool.desc}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-primary mt-3">
                    Open tool <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ) : tool.client ? (
                <>
                  <h3 className="font-semibold mb-3 text-white">{tool.title}</h3>
                  <SerpPreview />
                </>
              ) : tool.api ? (
                <UrlTool api={tool.api} title={tool.title} />
              ) : null}
            </div>
          ))}
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
