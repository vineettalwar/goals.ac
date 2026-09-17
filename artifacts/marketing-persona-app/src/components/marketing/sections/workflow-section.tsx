"use client";

import { useRef } from "react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";

const WORKFLOW_STEPS = [
  {
    title: "Ground the brand",
    desc: "Scrape the site, set voice memory, connect GSC. SEO Chat can onboard from a URL — no blank workspace.",
  },
  {
    title: "Brief, then draft",
    desc: "Keywords, competitors, and intent become a brief. Studio (or Chat) drafts long-form in that voice — comparison, listicle, case study included.",
  },
  {
    title: "Humanize, score, approve",
    desc: "Editorial + SERP scores, readiness gates, approve-first live publish. Autopilot is the same path on a schedule.",
  },
  {
    title: "Publish and act",
    desc: "WordPress draft-first (plugin + Rank Math). Action Queue surfaces CTR gaps and slip so the next piece is not a guess.",
  },
] as const;

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="border-t border-border bg-background py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-14">
          <EditorialHeading
            line1="One desk, end to end"
            description="Research to publish with human review. Chat, Studio, Autopilot, and Daily Five share the same generators — not a fire-and-forget content farm."
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

        <p className="scroll-reveal mt-12 max-w-3xl border-t border-border pt-8 text-sm leading-relaxed text-muted-foreground">
          Deep publish: WordPress, Ghost, Shopify. Basic publish elsewhere. After the article, Social Hub
          covers LinkedIn, X, Meta, Bluesky, and Mastodon.
        </p>
      </div>
    </section>
  );
}
