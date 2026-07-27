"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";
import {
  CONTACT_CTA_LABEL,
  CONTACT_HREF,
} from "@/lib/marketing/site/marketing-contact";

const glassCard = cardSurfaceClass("glass");

const PROOF_LINKS = [
  {
    label: "Free GEO audit",
    href: "/geo-audit",
    description: "Run a live scan. No account required.",
  },
  {
    label: "Article quality demo",
    href: "/article-quality",
    description: "See the /100 score breakdown on a sample draft.",
  },
  {
    label: "Content Studio",
    href: "/content-engine",
    description: "Research-backed drafts and cross-platform publishing.",
  },
] as const;

export function SocialProofSection() {
  return (
    <section className="py-24 bg-black border-t border-white/10 relative z-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-14 text-center">
          <EditorialHeading
            line1="See the product"
            line2="in action"
            description="Try a live GEO audit or the article quality demo — same tooling used in the studio."
            theme="dark"
          />
        </div>

        <div className={`${glassCard} p-6 mb-10 max-w-xl mx-auto flex gap-3 items-start`}>
          <Clock className="h-5 w-5 text-(--accent-warm) shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-white/65 leading-relaxed">
            Customer stories live on{" "}
            <Link href="/success-stories" className="text-white/80 hover:text-white underline-offset-2 hover:underline">
              /success-stories
            </Link>{" "}
            when we have results cleared to publish. The links below are live product demos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PROOF_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${glassCard} p-6 block h-full hover:bg-white/[0.07] transition-colors`}
            >
              <h3 className="font-bold mb-2 text-white">{item.label}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{item.description}</p>
              <span className="inline-flex items-center gap-1 text-xs text-white/80 mt-4">
                Try it <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center">
          <Link
            href={CONTACT_HREF}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            {CONTACT_CTA_LABEL} <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
