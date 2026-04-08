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
import { Loader2, TrendingUp, Target, BarChart3 } from "lucide-react";

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
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-8 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Enterprise-grade execution plans.</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We don't do generic advice. Every roadmap provides specific tactics, measurable KPIs, and phased timelines tailored to your exact context.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-background border-none shadow-sm">
                <CardContent className="pt-6">
                  <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-6">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Clear Objectives</h3>
                  <p className="text-muted-foreground">Strategic milestones broken down by quarter, ensuring focus remains on high-leverage activities.</p>
                </CardContent>
              </Card>

              <Card className="bg-background border-none shadow-sm">
                <CardContent className="pt-6">
                  <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-6">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Actionable Tactics</h3>
                  <p className="text-muted-foreground">Step-by-step implementation details for outbound, inbound, and product-led growth motions.</p>
                </CardContent>
              </Card>

              <Card className="bg-background border-none shadow-sm">
                <CardContent className="pt-6">
                  <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-6">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Hard KPIs</h3>
                  <p className="text-muted-foreground">Quantifiable metrics for every phase, so you know exactly what success looks like.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
