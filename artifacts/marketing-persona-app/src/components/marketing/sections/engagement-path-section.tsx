"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { useRef } from "react";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";

const ENGAGEMENTS: Array<{
  step: string;
  name: string;
  description: string;
  featured?: boolean;
}> = [
  {
    step: "01",
    name: "GEO Audit Sprint",
    description: "Baseline AI visibility audit, competitor GEO scan, and a 90-day action plan.",
  },
  {
    step: "02",
    name: "AEO Foundation",
    description: "12-month content calendar, monthly briefs, CMS setup, and editorial review on every draft.",
    featured: true,
  },
  {
    step: "03",
    name: "Full GEO Program",
    description: "Ongoing production, multi-site publishing, citation tracking, and a dedicated strategist.",
  },
] ;

const glassCard = cardSurfaceClass("glass");

export function EngagementPathSection() {
  const gridRef = useRef<HTMLDivElement>(null);
  useMarketingScrollReveal(gridRef, ".scroll-reveal");

  return (
    <section className="py-24 bg-black border-t border-white/10 relative z-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-14 text-center">
          <EditorialHeading
            line1="How engagements"
            line2="work"
            description="Start free in the content studio, or add a hands-on program for your CMS, market, and goals."
            theme="dark"
          />
        </div>

        <div ref={gridRef} className="grid md:grid-cols-3 gap-6">
          {ENGAGEMENTS.map((item) => (
            <div
              key={item.name}
              className={`scroll-reveal ${glassCard} p-6 h-full flex flex-col ${
                item.featured ? "ring-2 ring-(--accent-warm)" : ""
              }`}
            >
              <div className="text-3xl font-bold text-(--accent-warm) mb-3">{item.step}</div>
              <h3 className="text-lg font-bold mb-2 text-white">{item.name}</h3>
              <p className="text-base text-white/65 leading-relaxed flex-1 mb-6">{item.description}</p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                View engagements <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-white/50">
          Not sure which tier fits?{" "}
          <Link href={PRODUCT_CTA_HREF} className="text-white/80 hover:text-white hover:underline">
            {PRODUCT_CTA_PRIMARY}
          </Link>
          {" "}or{" "}
          <Link href={CONTACT_HREF} className="text-white/80 hover:text-white hover:underline">
            {CONTACT_CTA_LABEL.toLowerCase()}
          </Link>
        </p>
      </div>
    </section>
  );
}
