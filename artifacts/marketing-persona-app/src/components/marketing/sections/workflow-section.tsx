"use client";

import { useRef } from "react";
import { BarChart3, FileSearch, PenLine, RefreshCw, Send } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const WORKFLOW_STEPS = [
  {
    step: "01",
    icon: FileSearch,
    title: "Research & brief",
    desc: "Pull keywords, competitors, and search intent into a brief before anything is drafted.",
  },
  {
    step: "02",
    icon: PenLine,
    title: "Draft in your brand voice",
    desc: "Generate long-form SEO articles from the brief, grounded in your brand profile.",
  },
  {
    step: "03",
    icon: RefreshCw,
    title: "Humanize & score",
    desc: "Run a humanize pass and dual editorial + SERP quality scores before you approve.",
  },
  {
    step: "04",
    icon: Send,
    title: "Review & publish",
    desc: "Approve the piece, then publish to your connected CMS with readiness gates.",
  },
  {
    step: "05",
    icon: BarChart3,
    title: "Measure & refresh",
    desc: "Track GEO and search signals, then refresh pages that are slipping.",
  },
] as const;

const CMS_PLATFORMS =
  "WordPress, Shopify, Drupal, Joomla, Notion, Webflow, Ghost, LinkedIn, X, Bluesky, and Mastodon";

const glassCard = cardSurfaceClass("glass");

export function WorkflowSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useMarketingScrollReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-24 bg-black border-t border-white/10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-14">
          <EditorialHeading
            line1="One workflow"
            line2="end to end"
            description="Research to publish with human review in the loop. Autopilot is an optional cadence on this same path."
            theme="dark"
          />
        </div>

        <ol className="space-y-4">
          {WORKFLOW_STEPS.map(({ step, icon: Icon, title, desc }) => (
            <li key={title} className={`scroll-reveal ${glassCard} p-5`}>
              <div className="flex gap-5">
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold tracking-wider text-white/45">{step}</span>
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/80">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-base text-white/65 leading-relaxed">{desc}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="scroll-reveal mt-12 text-sm text-white/50 text-center max-w-3xl mx-auto leading-relaxed">
          Works with {CMS_PLATFORMS}.
        </p>
      </div>
    </section>
  );
}
