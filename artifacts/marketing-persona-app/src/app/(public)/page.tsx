import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, FileText, Globe, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "goals.ac — AI-powered B2B content growth engine",
  description:
    "Generate custom 12-month growth roadmaps, create SEO-optimised articles tailored to your audience personas, and auto-publish to WordPress — no agency required.",
};

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Hero */}
      <section className="py-24 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-muted px-4 py-1.5 rounded-full text-xs font-medium text-muted-foreground mb-2">
          <Zap className="h-3.5 w-3.5 text-primary" /> AI-powered B2B growth strategy
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
          Turn your website into a<br />
          <span className="text-primary">content growth engine</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
          goals.ac generates custom 12-month growth roadmaps, creates SEO-optimised articles tailored to your audience personas, and automatically publishes to WordPress — no agency required.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/roadmaps"
            className="inline-flex items-center gap-2 border border-[--border] bg-white px-6 py-3 rounded-xl font-medium hover:bg-muted/50 transition-colors"
          >
            View roadmaps
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: <BarChart3 className="h-6 w-6" />,
            title: "Growth roadmaps",
            desc: "12-month B2B growth strategy tailored to your industry, location, and stage.",
          },
          {
            icon: <FileText className="h-6 w-6" />,
            title: "Persona-driven articles",
            desc: "Articles written for your specific audience personas — researched, structured, and SEO-ready.",
          },
          {
            icon: <Globe className="h-6 w-6" />,
            title: "Auto-publish to WordPress",
            desc: "Set your schedule and watch articles appear on your site. Zero manual work.",
          },
          {
            icon: <Zap className="h-6 w-6" />,
            title: "GEO / AI visibility",
            desc: "Optimise for AI search engines (ChatGPT, Perplexity, Gemini) with structured content.",
          },
        ].map((feature) => (
          <div key={feature.title} className="paper-card rounded-xl p-6 space-y-3">
            <div className="text-primary">{feature.icon}</div>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </section>

      {/* Social proof strip */}
      <section className="py-16 border-t border-[--border] text-center space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { step: "1", title: "Add your website", desc: "We scrape and analyse your brand, tone, and audience automatically." },
            { step: "2", title: "Define personas", desc: "Review your AI-generated audience personas or create your own." },
            { step: "3", title: "Sit back", desc: "Fresh, targeted articles publish to WordPress on your schedule." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto">{step}</div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 pb-24 text-center">
        <div className="paper-card rounded-2xl p-12 space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold">Ready to grow?</h2>
          <p className="text-muted-foreground">Start with a free growth roadmap. No credit card required.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Get your free roadmap <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
