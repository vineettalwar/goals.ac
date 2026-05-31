"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, RefreshCw, Globe, FileText, BarChart3, Search, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BrandProfile {
  id: number;
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  competitorUrls: string[];
}

interface Project {
  id: number;
  name: string;
  url: string;
  scrapeStatus: string | null;
  scrapeData: unknown;
  brandProfile: BrandProfile | null;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescraping, setRescraping] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState<Partial<BrandProfile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/website-projects/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data);
        if (data.brandProfile) setBrandForm(data.brandProfile);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleRescrape() {
    setRescraping(true);
    await fetch(`/api/website-projects/${params.id}/scrape`, { method: "POST" });
    toast.success("Re-scraping started");
    setRescraping(false);
  }

  async function saveBrand() {
    setSaving(true);
    const res = await fetch(`/api/website-projects/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandProfile: brandForm }),
    });
    if (!res.ok) { toast.error("Failed to save"); setSaving(false); return; }
    const data = await res.json();
    setProject(data);
    setBrandForm(data.brandProfile ?? {});
    setEditingBrand(false);
    setSaving(false);
    toast.success("Brand profile saved");
  }

  if (loading) return <div className="flex items-center justify-center p-16"><Spinner size="lg" /></div>;
  if (!project) return <div className="p-8 text-muted-foreground">Project not found.</div>;

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground flex items-center gap-1 mt-1 hover:text-primary">
            <Globe className="h-3.5 w-3.5" />{project.url}<ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRescrape} disabled={rescraping}>
            {rescraping ? <><Spinner size="sm" /> Scraping...</> : <><RefreshCw className="h-4 w-4" /> Re-scrape</>}
          </Button>
          <Link href={`/projects/${params.id}/content-studio`}>
            <Button size="sm">
              <Layers className="h-4 w-4" /> Content Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Content Studio", href: `/projects/${params.id}/content-studio`, icon: <Layers className="h-5 w-5" /> },
          { label: "SEO Articles", href: `/projects/${params.id}/content-studio#seo`, icon: <FileText className="h-5 w-5" /> },
          { label: "GEO Audit", href: `/geo-audit`, icon: <Search className="h-5 w-5" /> },
          { label: "Analytics", href: `/keyword-tracking`, icon: <BarChart3 className="h-5 w-5" /> },
        ].map((item) => (
          <Link key={item.label} href={item.href}>
            <div className="paper-card p-4 flex flex-col items-center gap-2 text-center cursor-pointer hover:bg-muted/40 transition-colors rounded-xl">
              <span className="text-primary">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Scrape status */}
      <div className="paper-card p-5 flex items-center justify-between rounded-xl">
        <div>
          <p className="text-sm font-medium">Brand scrape status</p>
          <p className="text-xs text-muted-foreground mt-0.5">AI-extracted brand profile from your website</p>
        </div>
        <Badge variant={project.scrapeStatus === "done" ? "success" : project.scrapeStatus === "failed" ? "destructive" : "muted"}>
          {project.scrapeStatus ?? "not started"}
        </Badge>
      </div>

      {/* Brand profile */}
      <div className="paper-card p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Brand profile</h2>
          {!editingBrand ? (
            <Button variant="outline" size="sm" onClick={() => setEditingBrand(true)}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingBrand(false)}>Cancel</Button>
              <Button size="sm" onClick={saveBrand} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          )}
        </div>

        {editingBrand ? (
          <div className="space-y-4">
            {(["companyName", "industry", "targetAudience", "voiceTone"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label>{field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</Label>
                {field === "targetAudience" || field === "voiceTone" ? (
                  <Textarea
                    value={(brandForm[field] as string) ?? ""}
                    onChange={(e) => setBrandForm((p) => ({ ...p, [field]: e.target.value }))}
                    rows={2}
                  />
                ) : (
                  <Input
                    value={(brandForm[field] as string) ?? ""}
                    onChange={(e) => setBrandForm((p) => ({ ...p, [field]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Primary keywords (comma-separated)</Label>
              <Input
                value={(brandForm.primaryKeywords ?? []).join(", ")}
                onChange={(e) => setBrandForm((p) => ({ ...p, primaryKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Competitor URLs (one per line)</Label>
              <Textarea
                value={(brandForm.competitorUrls ?? []).join("\n")}
                onChange={(e) => setBrandForm((p) => ({ ...p, competitorUrls: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))}
                rows={3}
              />
            </div>
          </div>
        ) : project.brandProfile ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ["Company", project.brandProfile.companyName],
              ["Industry", project.brandProfile.industry],
              ["Target audience", project.brandProfile.targetAudience],
              ["Voice & tone", project.brandProfile.voiceTone],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground uppercase tracking-wide">{label}</dt>
                <dd className="mt-0.5 font-medium">{value || "—"}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground uppercase tracking-wide">Primary keywords</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {(project.brandProfile.primaryKeywords ?? []).map((k) => (
                  <Badge key={k} variant="muted">{k}</Badge>
                ))}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">No brand profile yet. Re-scrape to extract brand data automatically.</p>
        )}
      </div>
    </div>
  );
}
