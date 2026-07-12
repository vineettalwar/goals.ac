import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import {
  ArrowRight,
  Sparkles,
  Search,
  Calendar,
  Globe,
  Zap,
  CheckCircle2,
  BookOpen,
  Newspaper,
  GraduationCap,
  Map,
  FileSearch,
  LayoutTemplate,
  ImageIcon,
  Linkedin,
  Twitter,
  Instagram,
  Mail,
  Megaphone,
  MonitorPlay,
  Package,
  Radio,
  HelpCircle,
  Share2,
  Webhook,
} from "lucide-react";

const FORMAT_CATEGORIES = [
  {
    label: "Long-form Articles",
    color: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/[0.06]",
    formats: [
      { icon: BookOpen, name: "Blog Post", range: "900–1,200 words" },
      { icon: Newspaper, name: "News Article", range: "600–900 words" },
      { icon: GraduationCap, name: "Tutorial", range: "1,200–1,600 words" },
      { icon: Map, name: "Comprehensive Guide", range: "1,400–1,800 words" },
      { icon: FileSearch, name: "Whitepaper", range: "1,800–2,500 words" },
      { icon: LayoutTemplate, name: "Pillar Page", range: "2,000–3,000 words" },
      { icon: Globe, name: "Location Page", range: "800–1,200 words" },
      { icon: ImageIcon, name: "Infographic Outline", range: "400–600 words" },
    ],
  },
  {
    label: "Social Media",
    color: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
    bg: "bg-sky-500/[0.06]",
    formats: [
      { icon: Linkedin, name: "LinkedIn Post", range: "1,300–1,800 chars" },
      { icon: Twitter, name: "Twitter / X Thread", range: "9 tweets" },
      { icon: Instagram, name: "Instagram Post", range: "150–300 words" },
      { icon: Globe, name: "Facebook Post", range: "150–400 words" },
    ],
  },
  {
    label: "Email & Ads",
    color: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/[0.06]",
    formats: [
      { icon: Mail, name: "Email Sequence", range: "3 emails" },
      { icon: Megaphone, name: "Ad Copy", range: "Google + Meta" },
    ],
  },
  {
    label: "Web Copy",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.06]",
    formats: [
      { icon: MonitorPlay, name: "Landing Page Copy", range: "600–900 words" },
      { icon: Package, name: "Product Description", range: "300–500 words" },
      { icon: Radio, name: "Press Release", range: "500–700 words" },
      { icon: HelpCircle, name: "FAQ / Knowledge Base", range: "8–12 Q&As" },
    ],
  },
] as const;

const CMS_PLATFORMS = [
  { name: "WordPress", desc: "REST API + goals.ac plugin" },
  { name: "Shopify", desc: "Blog via goals.ac app" },
  { name: "Drupal", desc: "JSON:API plugin" },
  { name: "Joomla", desc: "Web Services plugin" },
  { name: "Notion", desc: "Markdown → blocks" },
  { name: "Webflow", desc: "CMS collection items" },
  { name: "Ghost", desc: "Admin API publish" },
  { name: "Webhook", desc: "HMAC-signed JSON to any URL" },
] as const;

const SOCIAL_PLATFORMS = [
  { name: "LinkedIn", desc: "Long-form posts" },
  { name: "X / Twitter", desc: "Threads" },
  { name: "Instagram", desc: "Captions + hashtags" },
  { name: "Facebook", desc: "Page posts" },
] as const;

export default function ContentEngine() {
  const { user } = useAuth();

  return (
    <Layout>
      <SEO
        title="Content Engine | goals.ac"
        description="Draft blog posts, guides, social posts, and web copy in your brand voice. Review, schedule, and publish to WordPress, Notion, Webflow, and social platforms."
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
              Content Studio
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
            >
              Draft, review, and publish from one workspace.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-10"
            >
              Blog posts, guides, social posts, and landing page copy. Set your brand voice once,
              generate drafts, and send approved pieces to your CMS.
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

        {/* Full content suite */}
        <section className="py-20 bg-background border-b border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground mb-4 tracking-wide uppercase">
                Content formats
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                18 formats across four categories
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Long-form articles, social posts, email sequences, and web copy. Repurpose any piece
                into another format from the same project.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {FORMAT_CATEGORIES.map((category) => (
                <div
                  key={category.label}
                  className={`rounded-2xl border ${category.border} ${category.bg} p-5`}
                >
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${category.color}`}>
                    {category.label}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {category.formats.map((format) => (
                      <div
                        key={format.name}
                        className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-card/80 px-3 py-2.5"
                      >
                        <format.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${category.color}`} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold leading-tight">{format.name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{format.range}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Repurpose any piece into any other format
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Brand voice applied to every draft
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Drag-and-drop content calendar
              </span>
            </div>
          </div>
        </section>

        {/* Publishing platforms */}
        <section className="py-20 bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Publish to the platforms you already use
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Connect WordPress, Notion, Webflow, Shopify, Ghost, Drupal, Joomla, or a webhook.
                Post to LinkedIn, X, Instagram, and Facebook from the same publish dialog.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-lg">CMS &amp; site publishing</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {CMS_PLATFORMS.map((platform) => (
                    <div
                      key={platform.name}
                      className="rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <div className="text-sm font-semibold">{platform.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{platform.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Share2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <h3 className="font-bold text-lg">Social publishing</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 mb-4">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <div
                      key={platform.name}
                      className="rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <div className="text-sm font-semibold">{platform.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{platform.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5 flex items-start gap-2">
                  <Webhook className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Webhook connector sends HMAC-signed JSON to Zapier, Make, n8n, or your own endpoint.
                  </p>
                </div>
              </div>
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
                    Set up your brand profile once.
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-5">
                    Add your industry, audience, voice, and sample writing. Every draft uses these settings.
                  </p>
                  <ul className="space-y-2.5">
                    {["Brand voice and tone", "Target audience", "Banned words and phrases", "Writing samples"].map((item) => (
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
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Generated draft</div>
                  <h3 className="font-bold text-lg mb-2">How early-stage SaaS teams plan content without an agency</h3>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {["1,847 words", "12 H2s", "7 min read"].map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{tag}</span>
                    ))}
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {[
                      "Introduction: Planning content on a small team",
                      "Why agency retainers stall at this stage",
                      "The content factory myth and what works instead",
                      "Building a repeatable in-house workflow",
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
                    Generate, edit, and approve.
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-5">
                    Enter a topic or pull from your keyword list. Edit inline, regenerate a section,
                    or mark the piece ready to publish.
                  </p>
                  <ul className="space-y-2.5">
                    {["Keyword list integration", "Inline editor with section regenerate", "Draft and ready status", "Repurpose into other formats"].map((item) => (
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
                    Publish and track from one place.
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-5">
                    Send approved pieces to your CMS or social accounts. See what is scheduled on the content calendar.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {["WordPress", "Shopify", "Notion", "Webflow", "Ghost", "LinkedIn", "X", "Webhook"].map((cms) => (
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
                      { day: "Mon", title: "How early-stage SaaS teams plan content without an agency", status: "Published", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                      { day: "Wed", title: "What to publish before you hire a content lead", status: "Scheduled", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                      { day: "Thu", title: "Building a weekly content review workflow", status: "Draft", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                      { day: "Fri", title: "LinkedIn post: three lessons from our first 90 days", status: "Generating", badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
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
                  Built for search engines and AI citations.
                </h2>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  Drafts include structured headings, schema markup, and clear answers to common questions.
                  Run a GEO audit to see what your site is missing.
                </p>
                <Button asChild variant="outline" className="border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] hover:text-white">
                  <Link to="/geo-audit">
                    Run a free GEO audit <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Structured headings and FAQ blocks in every long-form draft" },
                  { label: "Schema.org JSON-LD generated with each article" },
                  { label: "GEO audit checks for meta tags, schema, and llms.txt" },
                ].map((row) => (
                  <div key={row.label} className="rounded-2xl glass-card p-5 flex items-start gap-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
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
              Plan topics, draft content, and publish without switching tools.
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Free to start. Connect a project, set your brand voice, and generate your first draft in minutes.
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
