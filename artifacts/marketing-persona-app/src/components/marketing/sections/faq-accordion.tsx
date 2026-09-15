"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { EditorialHeading } from "./editorial-heading";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

export type FAQItem = {
  question: string;
  answer: ReactNode;
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
    <section className="border-t border-border bg-background py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center">
          <EditorialHeading line1={line1} line2={titleLine2} theme="light" />
        </div>
        <div className="space-y-3">
          {items.map((faq) => (
            <details key={faq.question} className={`${glassCard} group px-6 py-4`}>
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold tracking-normal text-foreground">
                {faq.question}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="mt-3 pb-1 text-sm leading-relaxed tracking-normal text-muted-foreground">
                {faq.answer}
              </div>
              {faq.helpHref ? (
                <Link
                  href={faq.helpHref}
                  className="mb-1 mt-2 inline-block text-sm text-foreground hover:underline"
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
