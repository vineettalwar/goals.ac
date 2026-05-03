import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Target, Compass, Zap, Users, ArrowRight, Sparkles, BarChart3, Shield } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <SEO
        title="About goals.ac — The AI content engine for B2B founders"
        description="We're building the AI content engine that helps B2B startups grow on autopilot — brand-aligned articles, GEO-optimized pages, and the strategy tools to know what to write next."
      />

      <div className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="relative py-28 md:py-36 overflow-hidden bg-mesh-dark text-zinc-50 border-b border-white/[0.06]">
          <div className="orb orb-primary w-[600px] h-[500px] top-[-10%] left-[50%] -translate-x-1/2" />
          <div className="orb orb-violet w-[400px] h-[400px] bottom-[-5%] right-[-5%]" />

          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-zinc-300 mb-8 tracking-wide uppercase"
            >
              About goals.ac
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.08]"
            >
              Content is the engine. We built it for you.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
            >
              We're building the AI content engine for B2B startups — because every founder deserves a
              compounding growth flywheel without an agency retainer.
            </motion.p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-8 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-4">
                  <Compass className="h-3 w-3" />
                  Our Mission
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5 leading-tight">
                  Every B2B startup deserves a content flywheel.
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                  The biggest growth lever for B2B startups is content — articles that rank in Google, pages that get cited by AI tools, playbooks that drive inbound. But agencies are expensive and freelancers are inconsistent.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  goals.ac is the AI content engine that ships brand-aligned content continuously — backed by the strategy tools you need to know what to write next.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Target, label: "Brand-aligned by default", desc: "Every piece sounds like you wrote it — voice, tone, and POV captured up front." },
                  { icon: BarChart3, label: "Built to rank", desc: "Optimized for both Google search and AI citation. Real keywords, real intent." },
                  { icon: Zap, label: "Ship continuously", desc: "From draft to published in minutes. Multi-CMS, calendar, approval flow." },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
                    <div className="rounded-lg bg-blue-500/10 border border-blue-400/20 w-10 h-10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.label}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 bg-mesh-dark text-zinc-50 border-y border-white/[0.06] relative overflow-hidden">
          <div className="orb orb-indigo w-[500px] h-[400px] top-[10%] left-[-5%]" />

          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-semibold text-blue-300 mb-4">
                <Sparkles className="h-3 w-3" />
                What we believe
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Principles, not playbooks.</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  num: "01",
                  title: "Speed compounds",
                  desc: "Founders who ship faster compound faster. Our tools are built for founders who'd rather build than plan.",
                },
                {
                  num: "02",
                  title: "Context beats generic",
                  desc: "A pre-seed AI startup in Amsterdam needs a different playbook than a Series B SaaS in Berlin. We respect that.",
                },
                {
                  num: "03",
                  title: "Free should mean free",
                  desc: "The core platform is free forever. We charge for power features — never for the basics every founder needs.",
                },
              ].map((value) => (
                <div key={value.num} className="rounded-2xl glass-card p-6 card-hover-glow">
                  <div className="text-4xl font-bold text-blue-400 mb-4">{value.num}</div>
                  <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{value.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Built for */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-8 max-w-4xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                <Users className="h-3 w-3" />
                Built for
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">B2B founders. Solo to Series B.</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We obsess over the messy middle: building product, finding fit, and scaling without burning runway.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                { title: "Pre-seed & Seed founders", desc: "Building MVPs and hunting for product-market fit. Need a roadmap that won't waste runway." },
                { title: "Series A & B operators", desc: "Scaling go-to-market without losing the plot. Need data-backed plays, not consultant fluff." },
                { title: "Solo founders", desc: "Wearing 10 hats. Need a co-pilot that handles strategy so you can ship product." },
                { title: "Growth teams", desc: "Already shipping. Need better intel on competitors, keywords, and content opportunities." },
              ].map((row) => (
                <div key={row.title} className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-bold mb-2">{row.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{row.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-background border-t border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl text-center">
            <Shield className="h-10 w-10 text-blue-500 mx-auto mb-5" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ready to build your growth engine?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Free forever for the core platform. Start with a roadmap or audit — sign up to unlock the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white border-0">
                <Link to="/signup">
                  Create free account <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
                <Link to="/">Build a roadmap →</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
