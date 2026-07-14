"use client";

import Link from "next/link";
import { EditorialHeading } from "./editorial-heading";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

export type FAQItem = {
  question: string;
  answer: string;
  helpHref?: string;
};

type FAQAccordionProps = {
  title?: string;
  titleLine1?: string;
  titleLine2?: string;
  items: FAQItem[];
};

const glassCard = cardSurfaceClass("glass", false);

export function FAQAccordion({
  title,
  titleLine1,
  titleLine2,
  items,
}: FAQAccordionProps) {
  const line1 = titleLine1 ?? title ?? "Common questions";

  return (
    <section className="py-24 bg-black border-t border-white/10">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <EditorialHeading line1={line1} line2={titleLine2} theme="dark" />
        </div>
        <div className="space-y-3">
          {items.map((faq) => (
            <details key={faq.question} className={`${glassCard} px-6 py-4 group`}>
              <summary className="text-base font-semibold tracking-normal cursor-pointer list-none flex justify-between items-center text-white">
                {faq.question}
                <span className="text-white/50 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="text-sm text-white/65 leading-relaxed tracking-normal mt-3 pb-1">
                {faq.answer}
              </p>
              {faq.helpHref ? (
                <Link
                  href={faq.helpHref}
                  className="inline-block text-sm text-white/80 hover:text-white hover:underline mt-2 mb-1"
                >
                  Read setup guide →
                </Link>
              ) : null}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
