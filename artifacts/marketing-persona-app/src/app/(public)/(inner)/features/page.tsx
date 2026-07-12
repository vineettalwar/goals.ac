import Link from "next/link";
import { Brain, Bot, Globe, Search, Wallet, Wand2 } from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Content Agent workflow",
    description: "Tell the agent your goals, get researched topic ideas, refine angles, and build articles in one flow.",
  },
  {
    icon: Wand2,
    title: "Humanized long-form articles",
    description: "Generate 1400-1800 word drafts with citations, FAQ sections, and clean structure ready for editing and publishing.",
  },
  {
    icon: Globe,
    title: "WordPress publishing",
    description: "Connect WordPress once, then publish manually or auto-publish from your content queue.",
  },
  {
    icon: Wallet,
    title: "BYOK + platform AI",
    description: "Use your own Gemini API key to control spend, or use the platform key and track estimated generation costs.",
  },
  {
    icon: Search,
    title: "SEO + GEO alignment",
    description: "Build articles optimized for search intent and AI engines with schema-ready metadata and citation support.",
  },
  {
    icon: Bot,
    title: "Autopilot queue",
    description: "Keep a live queue of ready, published, and failed drafts with per-article status, source, and metadata.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl font-bold">Features built for AI content teams</h1>
        <p className="text-lg text-muted-foreground">
          goals.ac combines research, writing, and publishing so teams can ship high-quality content faster.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="paper-card rounded-xl p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        ))}
      </div>

      <div className="paper-card rounded-2xl p-8 text-center max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold">Ready to test your first workflow?</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-5">
          Create your account, tell the agent what you want, and start building publish-ready articles.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90"
          >
            Start free
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted/50"
          >
            Compare plans
          </Link>
        </div>
      </div>
    </div>
  );
}
