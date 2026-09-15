"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import {
  CONTACT_CTA_LABEL,
  CONTACT_HREF,
} from "@/lib/marketing/site/marketing-contact";

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
    <section className="relative z-20 border-t border-white/10 bg-black py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14 text-center">
          <EditorialHeading
            line1="See the product"
            line2="in action"
            description="Try a live GEO audit or the article quality demo — same tooling used in the studio."
            theme="dark"
          />
        </div>

        <p className="mb-10 text-center text-sm text-white/65">
          Customer stories live on{" "}
          <Link
            href="/success-stories"
            className="text-white/80 underline-offset-2 hover:text-white hover:underline"
          >
            /success-stories
          </Link>{" "}
          when we have results cleared to publish.
        </p>

        <ul className="mx-auto max-w-xl space-y-6">
          {PROOF_LINKS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="group block">
                <h3 className="font-medium text-white">{item.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{item.description}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm text-white/80 group-hover:text-white">
                  Try it <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center">
          <Link
            href={CONTACT_HREF}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            {CONTACT_CTA_LABEL} <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </section>
  );
}
