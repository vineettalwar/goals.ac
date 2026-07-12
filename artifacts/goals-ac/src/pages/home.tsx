import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useListIndustries,
  useListLocations,
  GenerateRoadmapRequestStage,
} from "@workspace/api-client-react";
import {
  Loader2,
  Target,
  Pencil,
  LayoutGrid,
  Bookmark,
  GitBranch,
  CheckCircle2,
  Circle,
  KeyRound,
  Key,
  Search,
  BarChart3,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type GenerationPhase = "summary" | "phase0" | "phase1" | "phase2";

const PHASE_LABELS: Record<GenerationPhase, string> = {
  summary: "Executive Summary",
  phase0: "Phase 1: Foundation & Quick Wins (Months 1–3)",
  phase1: "Phase 2: Scaling & Automation (Months 4–6)",
  phase2: "Phase 3: Expansion (Months 7–12)",
};

const stageValues = Object.values(GenerateRoadmapRequestStage) as [
  GenerateRoadmapRequestStage,
  ...GenerateRoadmapRequestStage[],
];

const formSchema = z.object({
  industry: z.string().min(1, "Please select an industry"),
  location: z.string().min(1, "Please select a location"),
  stage: z.enum(stageValues, {
    required_error: "Please select a company stage",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { data: industries, isLoading: isLoadingIndustries } =
    useListIndustries();
  const { data: locations, isLoading: isLoadingLocations } = useListLocations();

  const [isPending, setIsPending] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<Set<GenerationPhase>>(
    new Set(),
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [cmsSummary, setCmsSummary] = useState<{
    notion: boolean;
    webflow: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/user/cms-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d: { notion: boolean; webflow: boolean }) => setCmsSummary(d))
      .catch(() => {});
  }, [token]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      industry: "",
      location: "",
      stage: stageValues[0],
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsPending(true);
    setCompletedPhases(new Set());
    setGenerationError(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const authHeaders: Record<string, string> = {};
      if (token) authHeaders["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`${API_BASE}/api/roadmaps/generate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          industry: data.industry,
          location: data.location,
          stage: data.stage,
        }),
        signal: ac.signal,
      });

      if (!response.ok || !response.body) {
        const errJson = await response
          .json()
          .catch(() => ({ error: "Generation failed" }));
        setGenerationError(errJson.error ?? "Generation failed");
        setIsPending(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace("event:", "").trim();
          const payload = JSON.parse(dataLine.replace("data:", "").trim());

          if (eventType === "summary") {
            setCompletedPhases((prev) => new Set([...prev, "summary"]));
          } else if (
            eventType === "phase" &&
            typeof payload.phaseIndex === "number"
          ) {
            const key = `phase${payload.phaseIndex}` as GenerationPhase;
            setCompletedPhases((prev) => new Set([...prev, key]));
          } else if (eventType === "cached" || eventType === "done") {
            navigate(`/roadmap/${payload.slug}`);
            return;
          } else if (eventType === "error") {
            setGenerationError(payload.error ?? "Generation failed");
            setIsPending(false);
            return;
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        setGenerationError("Roadmap generation failed. Please try again.");
        setIsPending(false);
      }
    }
  };

  const stages: { value: GenerateRoadmapRequestStage; label: string }[] = [
    { value: GenerateRoadmapRequestStage["pre-seed"], label: "Pre-Seed" },
    { value: GenerateRoadmapRequestStage.seed, label: "Seed" },
    { value: GenerateRoadmapRequestStage["series-a"], label: "Series A" },
    { value: GenerateRoadmapRequestStage["series-b"], label: "Series B" },
    { value: GenerateRoadmapRequestStage.growth, label: "Growth / Late Stage" },
  ];

  return (
    <Layout>
      <SEO
        title="goals.ac — Content planning and publishing for B2B teams"
        description="Plan, draft, review, and publish search content built around your market, company stage, and brand."
      />

      <div className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-zinc-950 text-zinc-50 border-b border-white/10">
          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl text-left">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="text-xs font-semibold text-zinc-400 mb-8 tracking-[0.18em] uppercase"
            >
              Content operations for B2B teams
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
              className="text-5xl md:text-7xl font-bold tracking-[-0.04em] mb-6 leading-[0.98] max-w-4xl"
            >
              Know what to publish next—and why.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
              className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed"
            >
              Build a practical content plan from your market, company stage,
              and site data. Draft in your brand voice, review the work, and
              publish to the CMS you already use.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: "easeOut" }}
              className="text-sm text-zinc-500 mb-12"
            >
              Start with a free 12-month roadmap. No account required.
            </motion.p>
          </div>
        </section>

        {/* Generator Section — floats over hero */}
        <section className="py-0 bg-background relative z-20 -mt-16">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.15,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <Card className="border-border glass-card overflow-hidden">
                <CardContent className="p-8 md:p-12">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wide">
                    Free starter tool
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    Generate your 2026 Growth Roadmap
                  </h2>
                  <p className="text-muted-foreground text-sm mb-8">
                    Choose your market and stage. We’ll return a sequenced plan
                    with priorities for the next 12 months. No account required.
                  </p>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-8"
                    >
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold">
                                Industry
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isLoadingIndustries}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 text-sm">
                                    <SelectValue
                                      placeholder={
                                        isLoadingIndustries
                                          ? "Loading..."
                                          : "Select industry"
                                      }
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(Array.isArray(industries)
                                    ? industries
                                    : []
                                  ).map((ind) => (
                                    <SelectItem key={ind.id} value={ind.name}>
                                      {ind.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold">
                                Location
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isLoadingLocations}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 text-sm">
                                    <SelectValue
                                      placeholder={
                                        isLoadingLocations
                                          ? "Loading..."
                                          : "Select location"
                                      }
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(Array.isArray(locations)
                                    ? locations
                                    : []
                                  ).map((loc) => (
                                    <SelectItem key={loc.id} value={loc.name}>
                                      {loc.name}, {loc.country}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="stage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">
                              Company Stage
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 text-sm">
                                  <SelectValue placeholder="Select current funding stage" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {stages.map((stage) => (
                                  <SelectItem
                                    key={stage.value}
                                    value={stage.value}
                                  >
                                    {stage.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="pt-2 space-y-4">
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full h-12 text-base font-semibold glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                          disabled={
                            isPending ||
                            isLoadingIndustries ||
                            isLoadingLocations
                          }
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Generating roadmap…
                              {user?.hasGeminiKey && (
                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
                                  <KeyRound className="h-3 w-3" />
                                  Using your API key
                                </span>
                              )}
                            </>
                          ) : (
                            "Build my roadmap"
                          )}
                        </Button>

                        {isPending && (
                          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-2">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wide mb-2">
                              Building your roadmap…
                            </p>
                            {(
                              Object.keys(PHASE_LABELS) as GenerationPhase[]
                            ).map((key) => {
                              const done = completedPhases.has(key);
                              return (
                                <div
                                  key={key}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  {done ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground shrink-0 animate-pulse" />
                                  )}
                                  <span
                                    className={
                                      done
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {PHASE_LABELS[key]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {generationError && (
                          <p className="text-sm text-red-600 dark:text-red-400 text-center">
                            {generationError}
                          </p>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Features Section — dark glass */}
        <section className="py-28 bg-background">
          <div className="container mx-auto px-4 md:px-8 max-w-5xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-4">
                What you can do
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                One place to run the content workflow.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Turn research into briefs and drafts, keep review in the loop,
                then publish and measure the result.
              </p>
            </div>

            {/* Top row: 2 large cards */}
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              {/* Card 1: Branded SEO Content */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">
                    Draft from a real brief
                  </h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3 border-blue-400/20">
                    <Pencil className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Set the audience, search intent, angle, evidence, and brand
                  voice before a draft is written. Edit every output before it
                  goes live.
                </p>
                <div className="mt-auto glass-inner p-4">
                  <div className="space-y-2.5">
                    {[
                      "Introduction",
                      "Key Insights",
                      "Implementation",
                      "Conclusion",
                    ].map((section, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400/70 flex-shrink-0" />
                        <div
                          className="h-1.5 rounded bg-white/10 flex-grow"
                          style={{ width: `${70 + i * 5}%` }}
                        />
                        <span className="text-xs text-zinc-500">{section}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      SEO Score
                    </div>
                    <div className="flex-1 h-1.5 rounded bg-white/10">
                      <div className="h-full w-4/5 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">
                      94/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: 30-Day Content Strategy */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">
                    Plan the next 30 days
                  </h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3 border-blue-400/20">
                    <LayoutGrid className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Prioritize topics using your site, competitors, and tracked
                  queries. Each item has an owner, format, and reason to exist.
                </p>
                <div className="mt-auto glass-inner p-4">
                  <div className="text-xs text-zinc-500 mb-3 font-semibold tracking-wide uppercase">
                    AI Tool Coverage
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      "ChatGPT",
                      "Google AI",
                      "Claude",
                      "Perplexity",
                      "Gemini",
                    ].map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-4 rounded text-[10px] flex items-center justify-center font-mono ${
                          i % 5 === 0
                            ? "bg-gradient-to-r from-blue-500/40 to-blue-600/40 text-blue-300 border border-blue-400/30"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom row: 3 smaller cards */}
            <div className="grid md:grid-cols-3 gap-5">
              {/* Card 3: Automated Publishing */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base font-bold text-foreground">
                    Controlled publishing
                  </h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-2 border-emerald-400/20">
                    <Bookmark className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  Send approved content to your CMS without rebuilding headings,
                  metadata, links, and schema by hand.
                </p>
                <div className="mt-auto glass-inner p-3">
                  <div className="text-xs text-zinc-500 mb-2.5 font-semibold tracking-wide uppercase">
                    {cmsSummary ? "Connected Platforms" : "Supported Platforms"}
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        name: "WordPress",
                        color: "bg-blue-400",
                        connected: cmsSummary ? true : false,
                      },
                      {
                        name: "Notion",
                        color: "bg-zinc-400",
                        connected: cmsSummary ? cmsSummary.notion : false,
                      },
                      {
                        name: "Webflow",
                        color: "bg-purple-400",
                        connected: cmsSummary ? cmsSummary.webflow : false,
                      },
                    ].map((cms) => (
                      <div key={cms.name} className="flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${cms.color} flex-shrink-0`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {cms.name}
                        </span>
                        {cmsSummary ? (
                          <span
                            className={`ml-auto text-xs font-medium ${cms.connected ? "text-emerald-400" : "text-zinc-500"}`}
                          >
                            {cms.connected ? "Connected" : "Not connected"}
                          </span>
                        ) : (
                          <span className="ml-auto text-xs text-zinc-500 font-medium">
                            Available
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 4: Multi-CMS Publishing */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base font-bold text-foreground">
                    Use your existing CMS
                  </h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-2 border-amber-400/20">
                    <GitBranch className="h-4 w-4 text-amber-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  Connect WordPress, Notion, Webflow, and other supported
                  platforms. Keep one review process across every destination.
                </p>
                <div className="mt-auto glass-inner p-3">
                  <div className="text-xs text-zinc-500 mb-2.5 font-semibold tracking-wide uppercase">
                    One-click publish to
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Notion Databases", pct: 100 },
                      { label: "Webflow CMS", pct: 100 },
                      { label: "WordPress REST", pct: 100 },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-28">
                          {row.label}
                        </span>
                        <div className="flex-1 h-1.5 rounded bg-white/10">
                          <div
                            className="h-full rounded bg-gradient-to-r from-amber-500/60 to-amber-400/60"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 5: Technical GEO Audit */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base font-bold text-foreground">
                    Technical visibility audit
                  </h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-2 border-sky-400/20">
                    <Key className="h-4 w-4 text-sky-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  Find missing schema, weak metadata, crawl problems, and page
                  structure that makes your content harder to retrieve or cite.
                </p>
                <div className="mt-auto glass-inner p-3">
                  <div className="text-xs text-zinc-500 mb-2.5 font-semibold tracking-wide uppercase">
                    GEO Score
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Schema", score: 92 },
                      { label: "Metadata", score: 78 },
                      { label: "Structure", score: 85 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-16">
                          {item.label}
                        </span>
                        <div className="flex-1 h-1.5 rounded bg-white/10">
                          <div
                            className={`h-full rounded ${item.score >= 85 ? "bg-emerald-400/70" : "bg-amber-400/70"}`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">
                          {item.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-background border-t border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-5xl">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                How it works
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                A clear path from research to publish.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Keep the speed of assisted drafting without giving up editorial
                judgment or control.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "Tell us your brand",
                  desc: "Add your market, audience, positioning, voice, and current site. These become constraints for planning and drafting.",
                },
                {
                  step: "02",
                  title: "Plan and draft",
                  desc: "Choose a priority, review the brief, and produce a draft with the required structure, sources, links, and metadata.",
                },
                {
                  step: "03",
                  title: "Review, publish, measure",
                  desc: "Approve the work, send it to your CMS, and track rankings and citations. Feed what you learn into the next brief.",
                },
              ].map((item, i) => (
                <div key={item.step} className="relative">
                  <div className="rounded-2xl border border-border bg-card p-6 h-full">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-3">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
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

        {/* FAQ */}
        <section className="py-24 bg-background border-t border-border">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Common questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know before starting.
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full space-y-3">
              {[
                {
                  q: "Is the roadmap generator really free?",
                  a: "Yes — fully free, no signup required. The roadmap is our free starter tool. The full AI content engine (article generation, GEO optimization, multi-CMS publishing) requires a free account.",
                },
                {
                  q: "How is this different from a content agency?",
                  a: "Agencies cost $5K–$15K/month and take weeks per piece. goals.ac generates brand-aligned, SEO-optimized content in minutes — at a fraction of the price. You stay in control of voice and approval.",
                },
                {
                  q: "What's a GEO audit?",
                  a: "GEO (Generative Engine Optimization) is SEO for AI tools. Our audit scans your site for technical gaps that hurt your visibility in ChatGPT, Perplexity, Google AI, and others.",
                },
                {
                  q: "Do you support my industry?",
                  a: "We support 50+ B2B verticals — SaaS, AI/ML, FinTech, HRTech, ClimaTech, AgriTech and more. If we don't have yours, the roadmap generator will adapt based on your inputs.",
                },
                {
                  q: "What about my data?",
                  a: "Your roadmap data is private to your account. We never sell data or share with third parties. See our Pro and Team plans for SOC 2 / GDPR docs.",
                },
              ].map((faq, i) => (
                <AccordionItem
                  key={faq.q}
                  value={`item-${i}`}
                  className="rounded-xl border border-border bg-card px-6 border-b"
                >
                  <AccordionTrigger className="text-base font-semibold hover:no-underline py-5">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Unlock more with signup */}
        <section className="py-24 bg-mesh-dark text-zinc-50 border-t border-white/[0.06] relative overflow-hidden">
          <div className="orb orb-violet w-[500px] h-[400px] top-[-10%] right-[-10%]" />
          <div className="orb orb-indigo w-[400px] h-[400px] bottom-[-10%] left-[-5%]" />

          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-semibold text-blue-300 mb-4">
                <Sparkles className="h-3 w-3" />
                Free with signup
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Continue from roadmap to execution.
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                Save your roadmap, inspect competitors, track search queries,
                and turn priorities into briefs and drafts.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mb-12">
              {[
                {
                  icon: Search,
                  title: "Competitor Analysis",
                  desc: "Compare a competitor’s topics, positioning, and content gaps with your own site.",
                  color: "text-purple-400",
                  border: "border-purple-400/20",
                },
                {
                  icon: BarChart3,
                  title: "Keyword Tracking",
                  desc: "Track target queries, recent positions, difficulty, and the pages assigned to each query.",
                  color: "text-emerald-400",
                  border: "border-emerald-400/20",
                },
                {
                  icon: MessageSquare,
                  title: "Roadmap Q&A",
                  desc: "Ask questions against the roadmap and project context without starting the analysis again.",
                  color: "text-blue-400",
                  border: "border-blue-400/20",
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className={`rounded-2xl glass-card p-6 flex flex-col card-hover-glow relative ${feat.border}`}
                >
                  <div className="absolute top-4 right-4">
                    <Lock className="h-3.5 w-3.5 text-zinc-500" />
                  </div>
                  <div
                    className={`rounded-xl glass-card-md w-10 h-10 flex items-center justify-center mb-4 ${feat.border}`}
                  >
                    <feat.icon className={`h-5 w-5 ${feat.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>

            {!user && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-8 text-base font-semibold glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                >
                  <Link to="/signup">
                    Create free account <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-base font-semibold border-white/15 bg-white/[0.04] text-zinc-100 hover:bg-white/[0.08] hover:text-white"
                >
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Final CTA — for logged-out marketing punch */}
        {!user && (
          <section className="py-28 bg-background border-t border-border">
            <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-6">
                  <Target className="h-3 w-3" />
                  For lean B2B teams
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
                  Put the next decision in writing.
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                  Start with a roadmap you can inspect, edit, and turn into
                  work—not another dashboard full of suggestions.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 px-8 text-base font-semibold glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                  >
                    <Link to="/signup">
                      Start for free <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="h-12 px-8 text-base font-semibold"
                  >
                    <Link to="/geo-audit">Or run a free GEO audit →</Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-6">
                  No credit card required · Build a roadmap or audit before you
                  sign up
                </p>
              </motion.div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
