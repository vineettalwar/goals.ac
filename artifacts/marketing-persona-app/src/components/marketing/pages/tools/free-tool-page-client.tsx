"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/layout/marketing-page-shell";
import { PageHero } from "@/components/marketing/heroes/page-hero";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HERO_IMAGES } from "@/lib/marketing/site/marketing-hero-images";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { FREE_TOOLS, FREE_TOOL_LIST, freeToolPath, type FreeToolSlug } from "@/lib/marketing/site/free-tools";
import { publicApiUrl } from "@/lib/marketing/site/public-api";

const glassCard = cardSurfaceClass("glass", false);
const glassCardHover = cardSurfaceClass("glass");

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

function UrlTool({ api }: { api: string }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(publicApiUrl(api), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Failed");
        return;
      }
      setResult(JSON.stringify(data, null, 2));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${glassCard} p-6 space-y-4`}>
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com" />
        <Button onClick={run} disabled={loading || !url}>{loading ? "…" : "Run"}</Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {result && <pre className="text-xs bg-white/5 rounded-lg p-4 overflow-x-auto max-h-96 text-white/80">{result}</pre>}
    </div>
  );
}

export function FreeToolPageClient({ slug }: { slug: FreeToolSlug }) {
  const tool = FREE_TOOLS[slug];
  const otherTools = FREE_TOOL_LIST.filter((t) => t.slug !== slug);

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Free tool"
          titleLine1={tool.heroLine1}
          titleLine2={tool.heroLine2}
          description={tool.heroDescription}
          backgroundImage={HERO_IMAGES.geoAudit.hero}
          ctas={[{ label: PRODUCT_CTA_PRIMARY, href: PRODUCT_CTA_HREF, variant: "primary" }]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <div className="max-w-2xl mx-auto">
          {tool.kind === "client" ? <SerpPreview /> : tool.api ? <UrlTool api={tool.api} /> : null}
        </div>
      </MarketingSection>

      <MarketingSection bordered className="py-16">
        <h2 className="text-xl font-semibold text-white mb-6">More free tools</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {otherTools.map((other) => (
            <Link key={other.slug} href={freeToolPath(other.slug)} className={`${glassCardHover} p-6 block group`}>
              <h3 className="font-semibold text-white group-hover:text-(--accent-warm) transition-colors">{other.title}</h3>
              <p className="text-sm text-white/65 mt-1">{other.shortDesc}</p>
              <span className="inline-flex items-center gap-1 text-xs text-(--accent-warm) mt-3">
                Open tool <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
          <Link href="/free-tools" className={`${glassCardHover} p-6 block group`}>
            <h3 className="font-semibold text-white group-hover:text-(--accent-warm) transition-colors">All free tools</h3>
            <p className="text-sm text-white/65 mt-1">GEO audit, article quality score, and every checker in one place.</p>
            <span className="inline-flex items-center gap-1 text-xs text-(--accent-warm) mt-3">
              Browse tools <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
