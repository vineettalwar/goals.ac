import { useState } from "react";
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
import { useListIndustries, useListLocations, useGenerateRoadmap, GenerateRoadmapRequestStage } from "@workspace/api-client-react";
import { Loader2, TrendingUp, Pencil, LayoutGrid, Bookmark, GitBranch, Key } from "lucide-react";

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
  const { data: industries, isLoading: isLoadingIndustries } = useListIndustries();
  const { data: locations, isLoading: isLoadingLocations } = useListLocations();
  const generateRoadmap = useGenerateRoadmap();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      industry: "",
      location: "",
      stage: undefined,
    },
  });

  const onSubmit = (data: FormValues) => {
    generateRoadmap.mutate(
      {
        data: {
          industry: data.industry,
          location: data.location,
          stage: data.stage,
        },
      },
      {
        onSuccess: (roadmap) => {
          navigate(`/roadmap/${roadmap.slug}`);
        },
      }
    );
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
        <section className="relative py-24 md:py-32 overflow-hidden bg-zinc-950 text-zinc-50 border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-zinc-950 to-zinc-950"></div>
          <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl text-center">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8">
              <TrendingUp className="mr-2 h-4 w-4" />
              Data-Driven Growth Strategies
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Stop guessing. <br className="hidden md:block" />
              <span className="text-zinc-400">Start executing.</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Generate a precise, AI-powered 12-month growth roadmap tailored to your specific industry, location, and company stage.
            </p>
          </div>
        </section>

        {/* Generator Section */}
        <section className="py-16 md:py-24 bg-background -mt-16 relative z-20">
          <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <Card className="shadow-2xl border-border/50 bg-card/50 backdrop-blur-xl">
              <CardContent className="p-8 md:p-12">
                <h2 className="text-2xl font-semibold tracking-tight mb-8">Generate your 2026 Growth Roadmap</h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid gap-8 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Industry</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingIndustries}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-base">
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
                            <FormLabel className="text-base font-medium">Location</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingLocations}>
                              <FormControl>
                                <SelectTrigger className="h-12 text-base">
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
                          <FormLabel className="text-base font-medium">Company Stage</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 text-base">
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

                    <div className="pt-4">
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 text-lg font-medium shadow-md transition-all hover:-translate-y-0.5"
                        disabled={generateRoadmap.isPending || isLoadingIndustries || isLoadingLocations}
                      >
                        {generateRoadmap.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing market & generating roadmap...
                          </>
                        ) : (
                          "Generate Growth Strategy"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 md:px-8 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to grow.</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From content creation to technical audits, every tool you need to dominate search and AI visibility.
              </p>
            </div>

            {/* Top row: 2 large cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Card 1: Branded SEO Content */}
              <div className="rounded-xl bg-zinc-50 p-6 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">Branded SEO Content</h3>
                  <div className="rounded-lg bg-white border border-zinc-100 shadow-sm w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3">
                    <Pencil className="h-4 w-4 text-zinc-600" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Generates brand-aligned articles optimized for search and AI visibility. Structured to rank, attract traffic, and build authority.</p>
                <div className="mt-auto rounded-lg bg-white border border-zinc-100 p-4">
                  <div className="space-y-2">
                    {["Introduction", "Key Insights", "Implementation", "Conclusion"].map((section, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary/60 flex-shrink-0" />
                        <div className="h-2 rounded bg-zinc-100 flex-grow" style={{ width: `${70 + i * 5}%` }} />
                        <span className="text-xs text-zinc-400">{section}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
                    <div className="text-xs font-medium text-primary">SEO Score</div>
                    <div className="flex-1 h-1.5 rounded bg-zinc-100">
                      <div className="h-full w-4/5 rounded bg-primary/70" />
                    </div>
                    <span className="text-xs text-zinc-500">94/100</span>
                  </div>
                </div>
              </div>

              {/* Card 2: 30-Day Content Strategy */}
              <div className="rounded-xl bg-zinc-50 p-6 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">30-Day Content Strategy</h3>
                  <div className="rounded-lg bg-white border border-zinc-100 shadow-sm w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3">
                    <LayoutGrid className="h-4 w-4 text-zinc-600" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Plans a full month of content based on ranking and citation trends. Topics and formats chosen to maximize discoverability.</p>
                <div className="mt-auto rounded-lg bg-white border border-zinc-100 p-4">
                  <div className="text-xs text-zinc-400 mb-3 font-medium">AI Tool Coverage</div>
                  <div className="flex flex-wrap gap-2">
                    {["ChatGPT", "Google AI", "Claude", "Perplexity", "Gemini"].map((tool) => (
                      <span key={tool} className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                        {tool}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-5 rounded text-xs flex items-center justify-center ${i % 5 === 0 ? "bg-primary/20 text-primary font-medium" : "bg-zinc-100 text-zinc-400"}`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom row: 3 smaller cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Card 3: Automated Publishing */}
              <div className="rounded-xl bg-zinc-50 p-6 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">Automated Publishing</h3>
                  <div className="rounded-lg bg-white border border-zinc-100 shadow-sm w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3">
                    <Bookmark className="h-4 w-4 text-zinc-600" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Publishes content directly to your CMS across platforms. Ensures consistent output without manual workflows.</p>
                <div className="mt-auto rounded-lg bg-white border border-zinc-100 p-3">
                  <div className="text-xs text-zinc-400 mb-2 font-medium">Connected Platforms</div>
                  <div className="space-y-1.5">
                    {["Notion", "Shopify", "WordPress", "Webflow"].map((cms) => (
                      <div key={cms} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-xs text-zinc-600">{cms}</span>
                        <span className="ml-auto text-xs text-green-500">Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 4: Authority Backlinks */}
              <div className="rounded-xl bg-zinc-50 p-6 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">Authority Backlinks</h3>
                  <div className="rounded-lg bg-white border border-zinc-100 shadow-sm w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3">
                    <GitBranch className="h-4 w-4 text-zinc-600" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Builds contextual backlinks through a trusted network. Strengthens authority and improves search and AI rankings.</p>
                <div className="mt-auto rounded-lg bg-white border border-zinc-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-400 font-medium">Domain Authority</span>
                    <span className="text-xs font-semibold text-primary">+18 pts</span>
                  </div>
                  <div className="space-y-1.5">
                    {[{ label: "DR 80+", val: 12 }, { label: "DR 60+", val: 34 }, { label: "DR 40+", val: 67 }].map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-12">{row.label}</span>
                        <div className="flex-1 h-1.5 rounded bg-zinc-100">
                          <div className="h-full rounded bg-primary/60" style={{ width: `${row.val}%` }} />
                        </div>
                        <span className="text-xs text-zinc-400">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 5: Technical GEO Audit */}
              <div className="rounded-xl bg-zinc-50 p-6 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">Technical GEO Audit</h3>
                  <div className="rounded-lg bg-white border border-zinc-100 shadow-sm w-9 h-9 flex items-center justify-center flex-shrink-0 ml-3">
                    <Key className="h-4 w-4 text-zinc-600" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-5">Scans your site for technical gaps affecting visibility. Identifies issues in schema, metadata, and structure that impact rankings.</p>
                <div className="mt-auto rounded-lg bg-white border border-zinc-100 p-3">
                  <div className="text-xs text-zinc-400 mb-2 font-medium">GEO Score</div>
                  <div className="space-y-1.5">
                    {[{ label: "Schema", score: 92 }, { label: "Metadata", score: 78 }, { label: "Structure", score: 85 }].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 w-16">{item.label}</span>
                        <div className="flex-1 h-1.5 rounded bg-zinc-100">
                          <div
                            className={`h-full rounded ${item.score >= 85 ? "bg-green-400" : "bg-amber-400"}`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500">{item.score}</span>
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
