import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search, Zap, ShieldCheck, BarChart2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function GeoAuditForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roadmapId = searchParams.get("roadmap_id");

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

      const response = await fetch(`${BASE}/api/geo-audits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      <div className="bg-zinc-950 text-zinc-50 py-16 md:py-24 border-b border-border">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Generative Engine Optimization
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Technical GEO Audit
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            Paste your website URL and we'll scan it for technical gaps that affect how AI engines like ChatGPT, Perplexity, and Google SGE understand your site.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-2xl">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Scan your website</CardTitle>
            <CardDescription>
              Enter the URL of the page you want to audit. We'll check 10 key GEO signals.
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
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isLoading} className="w-full gap-2">
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
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <span className="font-medium text-foreground">10 checks</span>
            <span>Schema, titles, headings, images, HTTPS & more</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BarChart2 className="w-7 h-7 text-primary" />
            <span className="font-medium text-foreground">GEO Score</span>
            <span>0–100 score showing AI readiness</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="w-7 h-7 text-primary" />
            <span className="font-medium text-foreground">Fix guidance</span>
            <span>Actionable recommendations for each issue</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
