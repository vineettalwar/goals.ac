"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Globe,
  GraduationCap,
  HelpCircle,
  ImageIcon,
  LayoutTemplate,
  Linkedin,
  Mail,
  Megaphone,
  MonitorPlay,
  Newspaper,
  Package,
  Radio,
  Search,
  Share2,
  Sparkles,
  Twitter,
  Webhook,
  Zap,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5174";

const FORMAT_CATEGORIES = [
  {
    label: "Long-form Articles",
    color: "text-blue-700",
    formats: [
      { icon: BookOpen, name: "Blog Post", range: "900–1,200 words" },
      { icon: Newspaper, name: "News Article", range: "600–900 words" },
      { icon: GraduationCap, name: "Tutorial", range: "1,200–1,600 words" },
      { icon: FileSearch, name: "Whitepaper", range: "1,800–2,500 words" },
      { icon: LayoutTemplate, name: "Pillar Page", range: "2,000–3,000 words" },
      { icon: Globe, name: "Location Page", range: "800–1,200 words" },
      { icon: ImageIcon, name: "Infographic Outline", range: "400–600 words" },
    ],
  },
  {
    label: "Social Media",
    color: "text-sky-700",
    formats: [
      { icon: Linkedin, name: "LinkedIn Post", range: "1,300–1,800 chars" },
      { icon: Twitter, name: "Twitter / X Thread", range: "9 tweets" },
    ],
  },
  {
    label: "Email & Ads",
    color: "text-violet-700",
    formats: [
      { icon: Mail, name: "Email Sequence", range: "3 emails" },
      { icon: Megaphone, name: "Ad Copy", range: "Google + Meta" },
    ],
  },
  {
    label: "Web Copy",
    color: "text-amber-700",
    formats: [
      { icon: MonitorPlay, name: "Landing Page Copy", range: "600–900 words" },
      { icon: Package, name: "Product Description", range: "300–500 words" },
      { icon: Radio, name: "Press Release", range: "500–700 words" },
      { icon: HelpCircle, name: "FAQ / Knowledge Base", range: "8–12 Q&As" },
    ],
  },
];

export function ContentEngineMarketing() {
  const { data: session } = useSession();
  const appCta = session ? `${APP_URL}/dashboard` : "/signup";
  const appLabel = session ? "Open app" : "Start free";

  return (
    <div className="flex flex-col">
      <section className="relative py-28 md:py-36 overflow-hidden bg-[#1A1A1A] text-white border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 mb-8 tracking-wide uppercase"
          >
            <Sparkles className="h-3 w-3" />
            Content Studio
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
          >
            Draft, review, and publish from one workspace.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-lg md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed mb-10"
          >
            Blog posts, guides, social posts, and landing page copy. Set your brand voice once,
            generate drafts, and send approved pieces to your CMS.
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href={appCta}>
                {appLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href="/pricing">See pricing →</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background border-b border-[--border]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
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
              <div key={category.label} className="paper-card rounded-2xl p-5">
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${category.color}`}>
                  {category.label}
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {category.formats.map((format) => (
                    <div
                      key={format.name}
                      className="flex items-start gap-2.5 rounded-lg border border-[--border] bg-white px-3 py-2.5"
                    >
                      <format.icon className={`h-4 w-4 mt-0.5 shrink-0 ${category.color}`} />
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
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-b border-[--border]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-6">
          <div className="paper-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">CMS &amp; site publishing</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {["WordPress", "Shopify", "Drupal", "Joomla", "Notion", "Webflow", "Ghost", "Webhook"].map(
                (name) => (
                  <div key={name} className="rounded-lg border border-[--border] bg-white px-3 py-2.5 font-medium">
                    {name}
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="paper-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">Social publishing</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm mb-4">
              {["LinkedIn", "X / Twitter", "Instagram", "Facebook"].map((name) => (
                <div key={name} className="rounded-lg border border-[--border] bg-white px-3 py-2.5 font-medium">
                  {name}
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-dashed border-[--border] bg-muted/40 px-3 py-2.5 flex items-start gap-2 text-xs text-muted-foreground">
              <Webhook className="h-4 w-4 mt-0.5 shrink-0" />
              Webhook connector sends HMAC-signed JSON to Zapier, Make, n8n, or your own endpoint.
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#1A1A1A] text-white border-y border-white/10">
        <div className="max-w-4xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 mb-4">
              <Search className="h-3 w-3" />
              GEO ready
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for search engines and AI citations.
            </h2>
            <p className="text-lg text-white/70 leading-relaxed mb-6">
              Drafts include structured headings, schema markup, and clear answers to common questions.
            </p>
            <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href="/geo-audit">
                Run a free GEO audit <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {[
              "Structured headings and FAQ blocks in every long-form draft",
              "Schema.org JSON-LD generated with each article",
              "GEO audit checks for meta tags, schema, and llms.txt",
            ].map((label) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-start gap-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-sm text-white/70 leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Zap className="h-10 w-10 text-primary mx-auto mb-5" />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Plan topics, draft content, and publish without switching tools.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Free to start. Connect a project, set your brand voice, and generate your first draft in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href={appCta}>
                {session ? "Open content studio" : "Create free account"} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8">
              <Link href="/">← Try the free roadmap first</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
