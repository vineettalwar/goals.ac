"use client";

import { useRef } from "react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";

const WORKFLOW_STEPS = [
  {
    title: "Brief",
    desc: "Keywords, competitors, and intent become a brief before anything is drafted.",
  },
  {
    title: "Draft",
    desc: "Long-form SEO articles in your brand voice from Content Studio.",
  },
  {
    title: "Review",
    desc: "Humanize, score, and approve. Readiness gates block sloppy meta and structure.",
  },
  {
    title: "Publish",
    desc: "Push to your CMS. Then measure search and AI citations, and refresh pages that slip.",
  },
] as const;

const CMS_PLATFORMS =
  "WordPress, Shopify, Drupal, Joomla, Notion, Webflow, Ghost, LinkedIn, X, Bluesky, and Mastodon";

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="border-t border-border bg-background py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <EditorialHeading
            line1="One workflow, end to end"
            description="Research to publish with human review. Autopilot is an optional cadence on this same path."
            theme="light"
            align="left"
          />
        </div>

        <ol className="max-w-2xl space-y-8">
          {WORKFLOW_STEPS.map(({ title, desc }) => (
            <li key={title} className="scroll-reveal">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-muted-foreground">{desc}</p>
            </li>
          ))}
        </ol>

        <p className="scroll-reveal mt-12 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Works with {CMS_PLATFORMS}.
        </p>
      </div>
    </section>
  );
}
