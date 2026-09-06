"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type FreeToolSlug } from "@/lib/marketing/site/free-tools";
import { publicApiUrl } from "@/lib/marketing/site/public-api";
import { normalizeHttpUrl } from "@/lib/utils/normalize-url";
import {
  LlmsResultView,
  MetaResultView,
  RobotsResultView,
  SitemapResultView,
} from "./free-tool-results";
import type { LlmsResult, MetaResult, RobotsResult, SitemapResult } from "./free-tool-types";

const RUN_LABEL: Record<Exclude<FreeToolSlug, "serp-preview">, string> = {
  "meta-checker": "Check meta",
  "llms-txt": "Generate llms.txt",
  "robots-txt": "Check robots.txt",
  "sitemap-checker": "Check sitemap",
};

export function UrlTool({ slug, api }: { slug: Exclude<FreeToolSlug, "serp-preview">; api: string }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaResult | null>(null);
  const [llms, setLlms] = useState<LlmsResult | null>(null);
  const [robots, setRobots] = useState<RobotsResult | null>(null);
  const [sitemap, setSitemap] = useState<SitemapResult | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeHttpUrl(url);
    if (!normalized) return;
    setLoading(true);
    setError(null);
    setMeta(null);
    setLlms(null);
    setRobots(null);
    setSitemap(null);
    try {
      const res = await fetch(publicApiUrl(api), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? "Failed");
        return;
      }
      if (slug === "meta-checker") setMeta(data as MetaResult);
      else if (slug === "llms-txt") setLlms(data as LlmsResult);
      else if (slug === "robots-txt") setRobots(data as RobotsResult);
      else setSitemap(data as SitemapResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={run} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Input
          type="text"
          inputMode="url"
          autoComplete="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yoursite.com"
          required
          className="h-12 text-base marketing-input-dark flex-1"
          aria-label="Website URL"
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 shrink-0 gap-2 hero-cta-primary border-0"
          disabled={loading || !url.trim()}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              Running…
            </>
          ) : (
            <>
              {RUN_LABEL[slug]}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-white/70">No account required · results stay in this browser</p>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      {meta && <MetaResultView data={meta} />}
      {llms && <LlmsResultView data={llms} />}
      {robots && <RobotsResultView data={robots} />}
      {sitemap && <SitemapResultView data={sitemap} />}
    </form>
  );
}
