"use client";

import { EditorialHeading } from "./editorial-heading";

export type FAQItem = {
  question: string;
  answer: string;
};

type FAQAccordionProps = {
  title?: string;
  titleLine1?: string;
  titleLine2?: string;
  items: FAQItem[];
};

export function FAQAccordion({
  title,
  titleLine1,
  titleLine2,
  items,
}: FAQAccordionProps) {
  const line1 = titleLine1 ?? title ?? "Common questions";

  return (
    <section className="py-24 bg-background border-t border-[--border]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <EditorialHeading line1={line1} line2={titleLine2} theme="light" />
        </div>
        <div className="space-y-3">
          {items.map((faq) => (
            <details key={faq.question} className="paper-card rounded-xl px-6 py-4 group">
              <summary className="text-base font-semibold cursor-pointer list-none flex justify-between items-center">
                {faq.question}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3 pb-1">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
