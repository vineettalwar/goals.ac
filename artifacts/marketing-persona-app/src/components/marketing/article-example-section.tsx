"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const DEMO_SCORE = 92;
const VOICE_TAGS = ["evidence-based", "founder-friendly", "action-oriented"];
const glassCard = cardSurfaceClass("glass");

export function ArticleExampleSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-24 bg-black border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-14">
          <EditorialHeading
            line1="Written in"
            line2="your voice"
            description="Every article inherits brand voice, internal links, citations, and a quality score you can inspect."
            theme="dark"
          />
        </div>

        <div className={`scroll-reveal ${glassCard} p-8 max-w-3xl mx-auto`}>
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative h-[100px] w-[100px] flex items-center justify-center">
                <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90 absolute">
                  <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth={7} />
                  <circle
                    cx={50}
                    cy={50}
                    r={40}
                    fill="none"
                    stroke="var(--accent-warm)"
                    strokeWidth={7}
                    strokeDasharray={251}
                    strokeDashoffset={251 - (DEMO_SCORE / 100) * 251}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-3xl font-bold text-white">{DEMO_SCORE}</span>
                  <span className="block text-xs text-white/50">/ 100</span>
                </div>
              </div>
              <span className="text-sm text-white/50 mt-2">Article score</span>
            </div>

            <div className="flex-1 space-y-4">
              <p className="text-lg font-semibold text-white">Sample B2B SaaS article</p>
              <div className="flex flex-wrap gap-2">
                {VOICE_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-white/65"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ul className="text-base text-white/65 space-y-1.5">
                <li>6 H2 sections and FAQ</li>
                <li>4 citations and 5 internal links</li>
                <li>JSON-LD schema and optimized meta</li>
                <li>1,847 words</li>
              </ul>
              <Link
                href={CONTACT_HREF}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white hover:underline"
              >
                {CONTACT_CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
