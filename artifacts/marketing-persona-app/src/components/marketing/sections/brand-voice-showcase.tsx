"use client";

import Link from "next/link";
import { PenLine, Sparkles } from "lucide-react";
import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);

const DEMO = {
  brandName: "Northwind CRM",
  colors: ["#0F172A", "#3B82F6", "#93C5FD", "#F1F5F9"],
  voiceTags: ["confident", "founder-friendly", "no jargon"],
  offerings: ["Pipeline analytics", "Revenue forecasting", "HubSpot sync"],
  excerpt: `Most CRM reporting still lives in spreadsheets because dashboards show numbers, not decisions. Northwind ties pipeline stages to forecast confidence so revenue leaders see which deals actually close, not just which reps logged activity last week.`,
  internalLinks: [
    { label: "Pipeline analytics", href: "#" },
    { label: "Revenue forecasting", href: "#" },
    { label: "HubSpot integration", href: "#" },
  ],
};

export function BrandVoiceShowcase() {
  return (
    <MarketingSection
      bordered
      className="py-16"
      badge="Written like you"
      titleLine1="Brand tailoring"
      titleLine2="in every draft"
      description="We pull colors, tone, and product links from your site, then weave offerings into each article."
    >
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <div className={`${glassCard} p-6 space-y-5`}>
          <p className="text-sm font-semibold text-white">How we tailored this for {DEMO.brandName}</p>
          <div>
            <p className="text-xs text-white/50 mb-2">1 · Brand colors</p>
            <div className="flex gap-2">
              {DEMO.colors.map((c) => (
                <span
                  key={c}
                  className="h-10 w-10 rounded-lg border border-white/10 shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-2">2 · Voice & tone</p>
            <div className="flex flex-wrap gap-2">
              {DEMO.voiceTags.map((t) => (
                <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-white/50 mb-2">3 · Cross-linked offerings</p>
            <div className="flex flex-wrap gap-2">
              {DEMO.offerings.map((o) => (
                <span key={o} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  {o}
                </span>
              ))}
            </div>
          </div>
          <Link
            href={CONTACT_HREF}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <PenLine className="h-4 w-4" />
            {PRODUCT_CTA_PRIMARY}
          </Link>
        </div>

        <div className={`${glassCard} overflow-hidden`}>
          <div className="border-b border-white/10 px-5 py-3 flex items-center gap-2 text-xs text-white/50">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Generated excerpt · humanized
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm leading-relaxed text-white/80">{DEMO.excerpt}</p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              {DEMO.internalLinks.map((link) => (
                <span key={link.label} className="text-xs text-primary underline-offset-2 hover:underline">
                  {link.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MarketingSection>
  );
}
