"use client";

import Link from "next/link";
import { useRef } from "react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { CONTACT_CTA_LABEL, CONTACT_HREF, PRODUCT_CTA_HREF, PRODUCT_CTA_PRIMARY } from "@/lib/marketing/site/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const TOUR_STEPS = ["Brand setup", "30-day plan", "Quality score", "CMS publish"];
const glassCard = cardSurfaceClass("glass", false);

export function VideoDemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-20 bg-black border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-12">
          <EditorialHeading
            line1="See the"
            line2="workflow in action"
            description="Brand setup, keyword research, draft, quality score, publish. You stay in the loop on each step."
            theme="dark"
          />
        </div>

        <div className={`scroll-reveal ${glassCard} overflow-hidden max-w-4xl mx-auto`}>
          <div className="relative aspect-video bg-linear-to-br from-white/10 to-white/5 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 text-center px-6 max-w-lg">
              <p className="marketing-section-label text-white/70 mb-3">Video walkthrough</p>
              <p className="text-white font-semibold text-lg">Recorded demo coming soon</p>
              <p className="text-white/70 text-base mt-3 leading-relaxed">
                We&apos;re preparing a product walkthrough. Until then,{" "}
                <Link href={PRODUCT_CTA_HREF} className="text-white underline hover:no-underline">
                  {PRODUCT_CTA_PRIMARY.toLowerCase()}
                </Link>{" "}
                or{" "}
                <Link href={CONTACT_HREF} className="text-white underline hover:no-underline">
                  {CONTACT_CTA_LABEL.toLowerCase()}
                </Link>
                , or try the{" "}
                <Link href="/article-quality" className="text-white underline hover:no-underline">
                  article quality demo
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-4 gap-px bg-white/10">
            {TOUR_STEPS.map((step) => (
              <div key={step} className="bg-white/5 p-4 text-center text-sm font-medium text-white/65">
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
