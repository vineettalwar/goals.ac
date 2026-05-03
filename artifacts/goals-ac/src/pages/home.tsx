import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useListIndustries, useListLocations, GenerateRoadmapRequestStage } from "@workspace/api-client-react";
import { Loader2, Target, Pencil, LayoutGrid, Bookmark, GitBranch, CheckCircle2, Circle, KeyRound, Key } from "lucide-react";
import { useAuth } from "@/context/auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type GenerationPhase = "summary" | "phase0" | "phase1" | "phase2";

const PHASE_LABELS: Record<GenerationPhase, string> = {
  summary: "Executive Summary",
  phase0: "Phase 1: Foundation & Quick Wins (Months 1–3)",
  phase1: "Phase 2: Scaling & Automation (Months 4–6)",
  phase2: "Phase 3: Market Domination & Expansion (Months 7–12)",
};

const stageValues = Object.values(GenerateRoadmapRequestStage) as [
  GenerateRoadmapRequestStage,
  ...GenerateRoadmapRequestStage[]
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
  const { data: industries, isLoading: isLoadingIndustries } = useListIndustries();
  const { data: locations, isLoading: isLoadingLocations } = useListLocations();

  const [isPending, setIsPending] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<Set<GenerationPhase>>(new Set());
  const [generationError, setGenerationError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      industry: "",
      location: "",
      stage: undefined,
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
        body: JSON.stringify({ industry: data.industry, location: data.location, stage: data.stage }),
        signal: ac.signal,
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({ error: "Generation failed" }));
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
          } else if (eventType === "phase" && typeof payload.phaseIndex === "number") {
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
        title="goals.ac — Generate Your 2026 Growth Roadmap"
        description="Programmatic SEO platform for ambitious B2B startup founders to generate AI-powered 12-month growth roadmaps."
      />

      <div className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative py-28 md:py-40 overflow-hidden bg-mesh-dark text-zinc-50 border-b border-white/[0.06]">
          {/* Decorative gradient orbs */}
          <div className="orb orb-primary w-[600px] h-[500px] top-[-10%] left-[50%] -translate-x-1/2" />
          <div className="orb orb-violet w-[400px] h-[400px] bottom-[-5%] right-[-5%]" />
          <div className="orb orb-indigo w-[300px] h-[300px] bottom-[10%] left-[-5%]" />

          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl text-center">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300 mb-8">
              Data-Driven Growth Strategies for B2B Startups
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.08]">
              Stop guessing.{" "}
              <br className="hidden md:block" />
              <span className="text-gradient">Start executing.</span>
            </h1>

            <p className="text-xl md:text-2xl text-zinc-400 mb-14 max-w-3xl mx-auto leading-relaxed">
              Generate a precise, AI-powered 12-month growth roadmap tailored to your specific industry, location, and company stage.
            </p>
          </div>
        </section>

        {/* Generator Section — floats over hero */}
        <section className="py-0 bg-background relative z-20 -mt-16">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <Card className="shadow-md dark:shadow-2xl border-white/10 glass-card overflow-hidden">
              <CardContent className="p-8 md:p-12">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Generate your 2026 Growth Roadmap</h2>
                <p className="text-muted-foreground text-sm mb-8">Free, instant, no sign-up required.</p>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold">Industry</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingIndustries}>
                              <FormControl>
                                <SelectTrigger className="h-11 text-sm">
                                  <SelectValue placeholder={isLoadingIndustries ? "Loading..." : "Select industry"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {industries?.map((ind) => (
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
                            <FormLabel className="text-sm font-semibold">Location</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingLocations}>
                              <FormControl>
                                <SelectTrigger className="h-11 text-sm">
                                  <SelectValue placeholder={isLoadingLocations ? "Loading..." : "Select location"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {locations?.map((loc) => (
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
                          <FormLabel className="text-sm font-semibold">Company Stage</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 text-sm">
                                <SelectValue placeholder="Select current funding stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stages.map((stage) => (
                                <SelectItem key={stage.value} value={stage.value}>
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
                        className="w-full h-12 text-base font-semibold glow-primary bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border-0 text-white"
                        disabled={isPending || isLoadingIndustries || isLoadingLocations}
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
                          "Generate Growth Strategy →"
                        )}
                      </Button>

                      {isPending && (
                        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-2">
                          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-2">Generating in parallel…</p>
                          {(Object.keys(PHASE_LABELS) as GenerationPhase[]).map((key) => {
                            const done = completedPhases.has(key);
                            return (
                              <div key={key} className="flex items-center gap-2 text-sm">
                                {done ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 text-zinc-600 shrink-0 animate-pulse" />
                                )}
                                <span className={done ? "text-zinc-200" : "text-zinc-500"}>
                                  {PHASE_LABELS[key]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {generationError && (
                        <p className="text-sm text-red-400 text-center">{generationError}</p>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section — dark glass */}
        <section className="py-28 bg-background">
          <div className="container mx-auto px-4 md:px-8 max-w-5xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-semibold text-blue-400 mb-4">
                Platform Features
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need to grow.</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From content creation to technical audits, every tool you need to dominate search and AI visibility.
              </p>
            </div>

            {/* Top row: 2 large cards */}
            <div className="grid md:grid-cols-2 gap-5 mb-5">
              {/* Card 1: Branded SEO Content */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">Branded SEO Content</h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3 border-blue-400/20">
                    <Pencil className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">Generates brand-aligned articles optimized for search and AI visibility. Structured to rank, attract traffic, and build authority.</p>
                <div className="mt-auto glass-inner p-4">
                  <div className="space-y-2.5">
                    {["Introduction", "Key Insights", "Implementation", "Conclusion"].map((section, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400/70 flex-shrink-0" />
                        <div className="h-1.5 rounded bg-white/10 flex-grow" style={{ width: `${70 + i * 5}%` }} />
                        <span className="text-xs text-zinc-500">{section}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
                    <div className="text-xs font-semibold text-blue-400">SEO Score</div>
                    <div className="flex-1 h-1.5 rounded bg-white/10">
                      <div className="h-full w-4/5 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">94/100</span>
                  </div>
                </div>
              </div>

              {/* Card 2: 30-Day Content Strategy */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">30-Day Content Strategy</h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3 border-blue-400/20">
                    <LayoutGrid className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">Plans a full month of content based on ranking and citation trends. Topics and formats chosen to maximize discoverability.</p>
                <div className="mt-auto glass-inner p-4">
                  <div className="text-xs text-zinc-500 mb-3 font-semibold tracking-wide uppercase">AI Tool Coverage</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {["ChatGPT", "Google AI", "Claude", "Perplexity", "Gemini"].map((tool) => (
                      <span key={tool} className="inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
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
                  <h3 className="text-base font-bold text-foreground">Automated Publishing</h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-2 border-emerald-400/20">
                    <Bookmark className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Publishes content directly to your CMS across platforms without manual workflows.</p>
                <div className="mt-auto glass-inner p-3">
                  <div className="text-xs text-zinc-500 mb-2.5 font-semibold tracking-wide uppercase">Connected Platforms</div>
                  <div className="space-y-2">
                    {["Notion", "Shopify", "WordPress", "Webflow"].map((cms) => (
                      <div key={cms} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{cms}</span>
                        <span className="ml-auto text-xs text-emerald-400 font-medium">Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 4: Authority Backlinks */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base font-bold text-foreground">Authority Backlinks</h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-2 border-amber-400/20">
                    <GitBranch className="h-4 w-4 text-amber-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Builds contextual backlinks through a trusted network to strengthen authority.</p>
                <div className="mt-auto glass-inner p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs text-zinc-500 font-semibold tracking-wide uppercase">Domain Authority</span>
                    <span className="text-xs font-bold text-blue-400">+18 pts</span>
                  </div>
                  <div className="space-y-2">
                    {[{ label: "DR 80+", val: 12 }, { label: "DR 60+", val: 34 }, { label: "DR 40+", val: 67 }].map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-12 font-mono">{row.label}</span>
                        <div className="flex-1 h-1.5 rounded bg-white/10">
                          <div className="h-full rounded bg-gradient-to-r from-blue-500/60 to-blue-600/60" style={{ width: `${row.val}%` }} />
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 5: Technical GEO Audit */}
              <div className="rounded-2xl glass-card p-6 flex flex-col card-hover-glow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base font-bold text-foreground">Technical GEO Audit</h3>
                  <div className="rounded-xl glass-card-md w-9 h-9 flex items-center justify-center flex-shrink-0 ml-2 border-sky-400/20">
                    <Key className="h-4 w-4 text-sky-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Scans your site for technical gaps in schema, metadata, and structure impacting AI rankings.</p>
                <div className="mt-auto glass-inner p-3">
                  <div className="text-xs text-zinc-500 mb-2.5 font-semibold tracking-wide uppercase">GEO Score</div>
                  <div className="space-y-2">
                    {[{ label: "Schema", score: 92 }, { label: "Metadata", score: 78 }, { label: "Structure", score: 85 }].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-16">{item.label}</span>
                        <div className="flex-1 h-1.5 rounded bg-white/10">
                          <div
                            className={`h-full rounded ${item.score >= 85 ? "bg-emerald-400/70" : "bg-amber-400/70"}`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">{item.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
