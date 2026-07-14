"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";

const DEMO_SCORE = 92;
const VOICE_TAGS = ["evidence-based", "founder-friendly", "action-oriented"];

export function ArticleExampleSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-24 bg-background border-t border-border">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-14">
          <EditorialHeading
            line1="Written in"
            line2="your voice"
            description="Every article inherits brand voice, internal links, citations, and a quality score you can inspect."
            theme="light"
          />
        </div>

        <div className="scroll-reveal paper-card rounded-2xl p-8 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative h-[100px] w-[100px] flex items-center justify-center">
                <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90 absolute">
                  <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(45, 59, 45, 0.15)" strokeWidth={7} />
                  <circle
                    cx={50}
                    cy={50}
                    r={40}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={7}
                    strokeDasharray={251}
                    strokeDashoffset={251 - (DEMO_SCORE / 100) * 251}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-3xl font-bold text-foreground">{DEMO_SCORE}</span>
                  <span className="block text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <span className="text-sm text-muted-foreground mt-2">Article score</span>
            </div>

            <div className="flex-1 space-y-4">
              <p className="text-lg font-semibold text-foreground">Sample B2B SaaS article</p>
              <div className="flex flex-wrap gap-2">
                {VOICE_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm px-2.5 py-1 rounded-full border border-border bg-background text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ul className="text-base text-muted-foreground space-y-1.5">
                <li>6 H2 sections and FAQ</li>
                <li>4 citations and 5 internal links</li>
                <li>JSON-LD schema and optimized meta</li>
                <li>1,847 words</li>
              </ul>
              <Link
                href={CONTACT_HREF}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
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
