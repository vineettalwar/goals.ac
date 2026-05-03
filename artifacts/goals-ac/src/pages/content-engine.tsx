import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import {
  ArrowRight,
  Sparkles,
  Pencil,
  Search,
  Calendar,
  Globe,
  Zap,
  CheckCircle2,
  Bot,
  Target,
  TrendingUp,
  Layers,
} from "lucide-react";

export default function ContentEngine() {
  const { user } = useAuth();

  return (
    <Layout>
      <SEO
        title="AI Content Engine — goals.ac"
        description="Generate brand-aligned SEO articles, GEO-optimized content, and growth playbooks on autopilot. The AI content engine for B2B startups."
      />

      <div className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="relative py-28 md:py-36 overflow-hidden bg-mesh-dark text-zinc-50 border-b border-white/[0.06]">
          <div className="orb orb-primary w-[700px] h-[500px] top-[-15%] left-[50%] -translate-x-1/2" />
          <div className="orb orb-violet w-[400px] h-[400px] bottom-[-5%] right-[-5%]" />
          <div className="orb orb-indigo w-[350px] h-[350px] bottom-[10%] left-[-5%]" />

          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-zinc-300 mb-8 tracking-wide uppercase"
            >
              <Sparkles className="h-3 w-3" />
              The Content Engine
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
            >
              Ship a year of content{" "}
              <span className="text-gradient">in a weekend.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-10"
            >
              SEO articles, GEO pages, social posts, growth playbooks. All brand-aligned. All built to rank.
              All published from one calendar.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Button
                asChild
                size="lg"
                className="h-12 px-8 text-base font-semibold glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white border-0"
              >
                <Link to={user ? "/dashboard" : "/signup"}>
                  {user ? "Open content studio" : "Start free"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white">
                <Link to="/pricing">See pricing →</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Content types row */}
        <section className="py-20 bg-background border-b border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Five content formats. One engine.</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Whatever your funnel needs — top-of-funnel SEO, mid-funnel comparison pages, bottom-funnel case studies — the engine handles it.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { icon: Pencil, label: "SEO Articles", desc: "Long-form, keyword-optimized, ready to rank.", iconBg: "bg-blue-500/10 border-blue-500/20", iconColor: "text-blue-600 dark:text-blue-400" },
                { icon: Bot, label: "GEO Pages", desc: "Built for AI citation in ChatGPT, Perplexity, Google AI.", iconBg: "bg-violet-500/10 border-violet-500/20", iconColor: "text-violet-600 dark:text-violet-400" },
                { icon: Layers, label: "Comparison Pages", desc: "vs-competitor pages that capture commercial intent.", iconBg: "bg-emerald-500/10 border-emerald-500/20", iconColor: "text-emerald-600 dark:text-emerald-400" },
                { icon: TrendingUp, label: "Growth Playbooks", desc: "Tactical guides that convert readers to leads.", iconBg: "bg-amber-500/10 border-amber-500/20", iconColor: "text-amber-600 dark:text-amber-400" },
                { icon: Target, label: "Landing Copy", desc: "Brand-aligned hero, feature, and CTA copy.", iconBg: "bg-rose-500/10 border-rose-500/20", iconColor: "text-rose-600 dark:text-rose-400" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-card p-5 card-hover-glow">
                  <div className={`rounded-lg w-10 h-10 flex items-center justify-center mb-4 border ${item.iconBg}`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <h3 className="font-bold mb-1.5">{item.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow showcase */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-8 max-w-5xl">
            <div className="space-y-24">
              {/* Step 1 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-4">
                    Step 1
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
                    Capture your brand once.
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-5">
                    Tell us your industry, audience, voice, and POV in 90 seconds. The engine learns your brand so every piece sounds like you wrote it.
                  </p>
                  <ul className="space-y-2.5">
                    {["Brand voice & tone profile", "Target audience personas", "Banned words & phrases", "Sample writing samples"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Brand profile</div>
                  <div className="space-y-3">
                    {[
                      { label: "Voice", value: "Confident, founder-direct, lightly playful" },
                      { label: "Audience", value: "Series A SaaS founders, 50–200 employees" },
                      { label: "POV", value: "Anti-agency, pro-shipping, data over opinion" },
                      { label: "Avoid", value: "Buzzwords, fluff, corporate hedging" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-start gap-3 text-sm">
                        <span className="font-semibold w-20 text-muted-foreground flex-shrink-0">{row.label}</span>
                        <span className="text-foreground">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1 rounded-2xl border border-border bg-card p-6 shadow-lg">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Generated draft · 2 min ago</div>
                  <h3 className="font-bold text-lg mb-2">Why most B2B SaaS founders waste their first $50K on content</h3>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {["SEO-optimized", "1,847 words", "12 H2s", "Reading: 7min"].map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{tag}</span>
                    ))}
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {[
                      "Introduction: The $50K mistake",
                      "Why agency retainers fail at this stage",
                      "The 'content factory' myth — and what works",
                      "Building an in-house engine on AI rails",
                      "Conclusion: Ship, measure, iterate",
                    ].map((heading, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{heading}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-8">Regenerate</Button>
                    <Button size="sm" className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white">Approve & schedule</Button>
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/[0.08] px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400 mb-4">
                    Step 2
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
                    Generate. Edit. Approve.
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-5">
                    Pick a topic — or let the engine pull from your keyword tracker — and get a brand-aligned draft in under 2 minutes. Edit inline, regenerate sections, or approve.
                  </p>
                  <ul className="space-y-2.5">
                    {["Pulls from your keyword tracker", "Inline AI editor with regenerate-section", "Approval workflow for teams", "Version history & rollback"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step 3 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                    Step 3
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
                    Publish anywhere. Track everywhere.
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-5">
                    Push approved pieces to Notion, Webflow, or WordPress with one click. Schedule from a drag-and-drop calendar. Watch keyword rankings and AI citations improve.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {["Notion", "Webflow", "WordPress", "Ghost", "Markdown export"].map((cms) => (
                      <span key={cms} className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-foreground border border-border">
                        {cms}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content calendar · This week</div>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    {[
                      { day: "Mon", title: "Why most B2B founders waste their first $50K on content", status: "Published", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                      { day: "Wed", title: "The case against content agencies in 2026", status: "Scheduled", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                      { day: "Thu", title: "vs Clearscope: which works for early-stage SaaS", status: "Draft", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                      { day: "Fri", title: "How we got cited 47 times in ChatGPT (case study)", status: "Generating", badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
                    ].map((row) => (
                      <div key={row.title} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className="text-xs font-bold text-muted-foreground w-9">{row.day}</div>
                        <div className="flex-1 text-sm font-medium truncate">{row.title}</div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${row.badge}`}>
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GEO callout */}
        <section className="py-24 bg-mesh-dark text-zinc-50 border-y border-white/[0.06] relative overflow-hidden">
          <div className="orb orb-violet w-[500px] h-[400px] top-[10%] right-[-5%]" />
          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/[0.08] px-3 py-1 text-xs font-semibold text-violet-300 mb-4">
                  <Search className="h-3 w-3" />
                  GEO ready
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
                  Optimized for AI tools, not just Google.
                </h2>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Your audience is asking ChatGPT, Perplexity, and Gemini for recommendations. We make sure your content is what they cite.
                </p>
                <Button asChild variant="outline" className="border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white">
                  <Link to="/geo-audit">
                    Run a free GEO audit <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-3">
                {[
                  { stat: "47%", label: "of B2B buying research now happens in AI tools" },
                  { stat: "12x", label: "more leads from AI-cited pages vs uncited" },
                  { stat: "6 mo", label: "average head start vs competitors not optimizing" },
                ].map((row) => (
                  <div key={row.stat} className="rounded-2xl glass-card p-5 flex items-center gap-5">
                    <div className="text-4xl font-bold text-gradient flex-shrink-0">{row.stat}</div>
                    <div className="text-sm text-zinc-400 leading-relaxed">{row.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl text-center">
            <Zap className="h-10 w-10 text-blue-500 mx-auto mb-5" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Stop renting an agency.<br />
              <span className="text-gradient">Own your content engine.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Free forever for the core platform. Sign up to start generating brand-aligned content in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white border-0">
                <Link to={user ? "/dashboard" : "/signup"}>
                  {user ? "Open content studio" : "Create free account"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
                <Link to="/">← Try the free roadmap first</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
