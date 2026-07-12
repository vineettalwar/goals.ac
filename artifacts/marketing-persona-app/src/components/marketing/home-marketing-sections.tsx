"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  GitBranch,
  Key,
  LayoutGrid,
  Lock,
  MessageSquare,
  Pencil,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CMS_PLATFORMS = [
  "WordPress",
  "Shopify",
  "Drupal",
  "Joomla",
  "Notion",
  "Webflow",
  "Ghost",
  "LinkedIn",
  "X / Twitter",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const transition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

export function HomeMarketingSections() {
  return (
    <>
      <section className="py-28 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-4">
              What you can do
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              One place to run the content workflow.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Turn research into briefs and drafts, keep review in the loop, then publish and
              measure the result.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div className="paper-card paper-card-hover rounded-2xl p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold">Draft from a real brief</h3>
                <div className="rounded-xl border border-primary/20 bg-primary/5 w-9 h-9 flex items-center justify-center shrink-0 ml-3">
                  <Pencil className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Set the audience, search intent, angle, evidence, and brand voice before a draft is
                written. Edit every output before it goes live.
              </p>
            </div>

            <div className="paper-card paper-card-hover rounded-2xl p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold">Plan the next 30 days</h3>
                <div className="rounded-xl border border-primary/20 bg-primary/5 w-9 h-9 flex items-center justify-center shrink-0 ml-3">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Prioritize topics using your site, competitors, and tracked queries. Each item has
                an owner, format, and reason to exist.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Bookmark,
                title: "Controlled publishing",
                desc: "Connect your CMS or social accounts once. Keep one review process across every destination.",
              },
              {
                icon: GitBranch,
                title: "Use your existing CMS",
                desc: "Publish to WordPress, Shopify, Notion, Ghost, and more — via native APIs or goals.ac plugins.",
              },
              {
                icon: Key,
                title: "Technical visibility audit",
                desc: "Find missing schema, weak metadata, and page structure that hurts retrieval or citation.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="paper-card paper-card-hover rounded-2xl p-6 flex flex-col">
                <div className="rounded-xl border border-primary/20 bg-primary/5 w-9 h-9 flex items-center justify-center mb-4">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {CMS_PLATFORMS.map((name) => (
              <span
                key={name}
                className="text-xs font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground border border-[--border]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-[--border]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              A clear path from research to publish.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Keep the speed of assisted drafting without giving up editorial judgment or control.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Tell us your brand",
                desc: "Add your market, audience, positioning, voice, and current site.",
              },
              {
                step: "02",
                title: "Plan and draft",
                desc: "Choose a priority, review the brief, and produce a draft with structure and metadata.",
              },
              {
                step: "03",
                title: "Review, publish, measure",
                desc: "Approve the work, send it to your CMS, and track rankings and citations.",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                <div className="paper-card rounded-2xl p-6 h-full">
                  <div className="text-3xl font-bold text-primary mb-3">{item.step}</div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-muted-foreground/30">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-[--border]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Common questions</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "Is the roadmap generator really free?",
                a: "Yes — fully free, no signup required. The full AI content engine requires a free account.",
              },
              {
                q: "How is this different from a content agency?",
                a: "Agencies cost $5K–$15K/month and take weeks per piece. goals.ac generates brand-aligned content in minutes at a fraction of the price.",
              },
              {
                q: "What's a GEO audit?",
                a: "GEO (Generative Engine Optimization) scans your site for gaps that hurt visibility in ChatGPT, Perplexity, Google AI, and others.",
              },
            ].map((faq) => (
              <details key={faq.q} className="paper-card rounded-xl px-6 py-4 group">
                <summary className="text-base font-semibold cursor-pointer list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3 pb-1">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#1A1A1A] text-white border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 mb-4">
              <Sparkles className="h-3 w-3" />
              Free with signup
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Continue from roadmap to execution.
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Save your roadmap, inspect competitors, track search queries, and turn priorities into
              briefs and drafts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {[
              { icon: Search, title: "Competitor Analysis", desc: "Compare topics, positioning, and content gaps." },
              { icon: BarChart3, title: "Keyword Tracking", desc: "Track target queries, positions, and assigned pages." },
              { icon: MessageSquare, title: "Roadmap Q&A", desc: "Ask questions against your roadmap context." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 relative">
                <Lock className="h-3.5 w-3.5 text-white/40 absolute top-4 right-4" />
                <Icon className="h-5 w-5 text-white/80 mb-4" />
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href="/signup">
                Create free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-28 bg-background border-t border-[--border]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={transition}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-6">
              <Target className="h-3 w-3" />
              For lean B2B teams
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
              Put the next decision in writing.
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Start with a roadmap you can inspect, edit, and turn into work—not another dashboard
              full of suggestions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-8">
                <Link href="/signup">
                  Start for free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="h-12 px-8">
                <Link href="/geo-audit">Or run a free GEO audit →</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
