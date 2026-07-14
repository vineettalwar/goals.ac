"use client";

import { useRef } from "react";
import { Bookmark, GitBranch, Key, LayoutGrid, Pencil } from "lucide-react";
import { EditorialHeading } from "./editorial-heading";
import { useMarketingScrollReveal } from "@/hooks/use-marketing-scroll";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";

const WORKFLOW_ITEMS = [
  {
    icon: Pencil,
    title: "Draft from a real brief",
    desc: "Set audience, search intent, angle, evidence, and brand voice before a draft is written.",
  },
  {
    icon: LayoutGrid,
    title: "Plan the next 30 days",
    desc: "Prioritize topics using your site, competitors, and tracked queries.",
  },
  {
    icon: Bookmark,
    title: "Controlled publishing",
    desc: "Connect your CMS once. Keep one review process across every destination.",
  },
  {
    icon: GitBranch,
    title: "Use your existing CMS",
    desc: "WordPress, Shopify, Notion, Ghost, and more via native APIs or goals.ac plugins.",
  },
  {
    icon: Key,
    title: "Technical visibility audit",
    desc: "Find missing schema, weak metadata, and page structure that hurts citation.",
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
            description="Turn research into briefs and drafts, keep review in the loop, then publish and measure the result."
            theme="dark"
          />
        </div>

        <ul className="space-y-4">
          {WORKFLOW_ITEMS.map(({ icon: Icon, title, desc }) => (
            <li key={title} className={`scroll-reveal ${glassCard} p-5`}>
              <div className="flex gap-5">
                <div className="shrink-0 mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/80">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1.5">{title}</h3>
                  <p className="text-base text-white/65 leading-relaxed">{desc}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="scroll-reveal mt-12 text-sm text-white/50 text-center max-w-3xl mx-auto leading-relaxed">
          Works with {CMS_PLATFORMS}.
        </p>
      </div>
    </section>
  );
}
