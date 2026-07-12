import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Zap, ShieldCheck, BarChart2, FolderOpen, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/context/active-project";

import { useCreateGeoAudit } from "@workspace/api-client-react";

function fadeUp(delay: number = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.48, delay, ease: "easeOut" as const },
  };
}

export default function GeoAuditForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roadmapId = searchParams.get("roadmap_id");

  const { user } = useAuth();
  const { projects, activeProjectId, setActiveProjectId } = useActiveProject();

  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAudit = useCreateGeoAudit({
    mutation: {
      onSuccess: (data) => {
        navigate(`/geo-audit/${data.id}${roadmapId ? `?roadmap_id=${roadmapId}` : ""}`);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let normalizedUrl = url.trim();
    if (!normalizedUrl) {
      setError("Please enter a URL.");
      return;
    }
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    createAudit.mutate({
      data: {
        url: normalizedUrl,
        roadmap_id: roadmapId ? Number(roadmapId) : undefined,
        website_project_id: activeProjectId && user ? activeProjectId : undefined,
      },
    });
  };

  return (
    <Layout>
      <SEO
        title="GEO Audit — Check Your AI Visibility | goals.ac"
        description="Scan your website for technical gaps that affect AI search visibility. Get a GEO score and actionable fixes."
      />

      {/* Hero */}
      <div className="relative bg-mesh-dark text-zinc-50 py-20 md:py-28 border-b border-white/[0.06] overflow-hidden">
        <div className="orb orb-primary w-[560px] h-[420px] top-[-15%] left-[50%] -translate-x-1/2" />
        <div className="orb orb-violet w-[280px] h-[280px] bottom-[-15%] right-[5%]" />

        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-3xl text-center">
          <motion.div
            {...fadeUp(0)}
            className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.06] rounded-full px-4 py-1.5 text-xs font-semibold text-zinc-300 mb-7 tracking-wide uppercase"
          >
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            Generative Engine Optimization
          </motion.div>

          <motion.h1
            {...fadeUp(0.08)}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.06]"
          >
            Technical GEO Audit
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="text-base md:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed"
          >
            Paste your URL and we'll scan it for gaps that affect how AI engines like
            ChatGPT, Perplexity, and Google SGE understand your site.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-14 max-w-2xl">

        {/* Form card */}
        <motion.div {...fadeUp(0.26)}>
          <Card className="border-border glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Scan your website</CardTitle>
              <CardDescription>
                Enter the page URL you want to audit. We check 10 key GEO signals.
                {!user && (
                  <span className="block mt-1 text-xs">
                    <a href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2">Sign up</a> to save results to a project.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium">Website URL</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      id="url"
                      type="text"
                      placeholder="https://yourstartup.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-9 h-11"
                      disabled={createAudit.isPending}
                    />
                  </div>
                </div>

                {user && projects.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Save to project <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select
                      value={activeProjectId ? String(activeProjectId) : "__none__"}
                      onValueChange={(v) => setActiveProjectId(v === "__none__" ? null : Number(v))}
                    >
                      <SelectTrigger className="gap-1.5 h-11">
                        <FolderOpen className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No project</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={createAudit.isPending}
                  className="w-full h-11 gap-2 glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white font-medium"
                >
                  {createAudit.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning your website…
                    </>
                  ) : (
                    <>
                      Run GEO Audit
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat cards */}
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, label: "10 checks", desc: "Schema, titles, headings, images, HTTPS & more" },
            { icon: BarChart2, label: "GEO Score", desc: "0–100 score showing AI visibility readiness" },
            { icon: Zap, label: "Fix guidance", desc: "Actionable recommendations for each issue" },
          ].map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              {...fadeUp(0.36 + i * 0.08)}
              className="flex flex-col items-center gap-2.5 glass-card-md rounded-xl p-5 text-center text-sm text-muted-foreground"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-foreground text-sm">{label}</span>
              <span className="text-xs leading-relaxed">{desc}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
