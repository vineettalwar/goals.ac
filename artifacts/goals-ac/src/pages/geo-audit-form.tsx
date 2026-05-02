import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Zap, ShieldCheck, BarChart2, FolderOpen } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/context/active-project";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function GeoAuditForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roadmapId = searchParams.get("roadmap_id");

  const { user, token } = useAuth();
  const { projects, activeProjectId, setActiveProjectId } = useActiveProject();

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setIsLoading(true);
    try {
      const body: Record<string, unknown> = { url: normalizedUrl };
      if (roadmapId) body.roadmap_id = Number(roadmapId);
      if (activeProjectId && user) body.website_project_id = activeProjectId;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${BASE}/api/geo-audits`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      navigate(`/geo-audit/${data.id}${roadmapId ? `?roadmap_id=${roadmapId}` : ""}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="GEO Audit — Check Your AI Visibility | goals.ac"
        description="Scan your website for technical gaps that affect AI search visibility. Get a GEO score and actionable fixes."
      />

      {/* Hero */}
      <div className="relative bg-mesh-dark text-zinc-50 py-16 md:py-24 border-b border-white/[0.06] overflow-hidden">
        <div className="orb orb-primary w-[500px] h-[400px] top-[-20%] left-[50%] -translate-x-1/2" />
        <div className="orb orb-violet w-[250px] h-[250px] bottom-[-10%] right-[0%]" />

        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/15 text-blue-300 border border-blue-500/25 rounded-full px-4 py-1.5 text-sm font-semibold mb-6 badge-glow">
            <Zap className="w-4 h-4" />
            Generative Engine Optimization
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight text-gradient">
            Technical GEO Audit
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            Paste your website URL and we'll scan it for technical gaps that affect how AI engines like ChatGPT, Perplexity, and Google SGE understand your site.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-2xl">
        <Card className="border-white/[0.08] glass-card shadow-none">
          <CardHeader>
            <CardTitle>Scan your website</CardTitle>
            <CardDescription>
              Enter the URL of the page you want to audit. We'll check 10 key GEO signals.
              {!user && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  <a href="/signup" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Sign up</a> to save results to a project.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="url"
                    type="text"
                    placeholder="https://yourstartup.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 hover:border-white/20 transition-colors"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {user && projects.length > 0 && (
                <div className="space-y-2">
                  <Label>Save to project (optional)</Label>
                  <Select
                    value={activeProjectId ? String(activeProjectId) : "__none__"}
                    onValueChange={(v) => setActiveProjectId(v === "__none__" ? null : Number(v))}
                  >
                    <SelectTrigger className="gap-1.5 bg-white/5 border-white/10">
                      <FolderOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
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
                disabled={isLoading}
                className="w-full gap-2 glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning your website…
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Run GEO Audit
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-10 grid sm:grid-cols-3 gap-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2 glass-card-md rounded-xl p-5">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
            <span className="font-semibold text-foreground">10 checks</span>
            <span>Schema, titles, headings, images, HTTPS & more</span>
          </div>
          <div className="flex flex-col items-center gap-2 glass-card-md rounded-xl p-5">
            <BarChart2 className="w-7 h-7 text-blue-400" />
            <span className="font-semibold text-foreground">GEO Score</span>
            <span>0–100 score showing AI readiness</span>
          </div>
          <div className="flex flex-col items-center gap-2 glass-card-md rounded-xl p-5">
            <Zap className="w-7 h-7 text-blue-400" />
            <span className="font-semibold text-foreground">Fix guidance</span>
            <span>Actionable recommendations for each issue</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
