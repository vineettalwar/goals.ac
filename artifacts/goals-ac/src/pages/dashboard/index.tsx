import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/use-auth";
import { Loader2, Plus, Globe, ExternalLink, Trash2, Clock, CheckCircle2, XCircle, FileText, ArrowRight } from "lucide-react";
import { DashboardProjectsGrid, type WebsiteProject } from "./dashboard-projects-grid";
import { WIZARD_DONE_KEY } from "@/pages/onboarding";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DraftPiece {
  id: number;
  title: string;
  websiteProjectId: number;
  projectName?: string;
  formatType: string;
  wordCount: number;
  createdAt: string;
}

const addProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Must be a valid URL (e.g., https://example.com)"),
});
type AddProjectForm = z.infer<typeof addProjectSchema>;

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [drafts, setDrafts] = useState<DraftPiece[]>([]);
  const [draftsExpanded, setDraftsExpanded] = useState(false);
  const [visibilityScore, setVisibilityScore] = useState<number | null>(null);
  const [geoScore, setGeoScore] = useState<number | null>(null);

  const form = useForm<AddProjectForm>({
    resolver: zodResolver(addProjectSchema),
    defaultValues: { name: "", url: "" },
  });

  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/website-projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as WebsiteProject[];
        setProjects(data);
        if (data.length === 0 && !localStorage.getItem(WIZARD_DONE_KEY)) {
          navigate("/onboarding", { replace: true });
        }
        const allDrafts: DraftPiece[] = [];
        await Promise.all(
          data.map(async (project) => {
            try {
              const r = await fetch(`${API_BASE}/api/website-projects/${project.id}/content-pieces?status=draft`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (r.ok) {
                const pieces = await r.json() as DraftPiece[];
                pieces.forEach((p) => allDrafts.push({ ...p, projectName: project.name }));
              }
            } catch { }
          })
        );
        allDrafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDrafts(allDrafts);

        if (data.length > 0) {
          fetch(`${API_BASE}/api/website-projects/${data[0].id}/visibility`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((v: { visibilityScore?: number; latestGeoScore?: number | null } | null) => {
              if (v) {
                setVisibilityScore(v.visibilityScore ?? null);
                setGeoScore(v.latestGeoScore ?? null);
              }
            })
            .catch(() => {});
        }
      }
    } finally {
      setIsLoadingProjects(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const onAddProject = async (data: AddProjectForm) => {
    const res = await fetch(`${API_BASE}/api/website-projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      form.setError("root", { message: err.error ?? "Failed to create project" });
      return;
    }
    const project = await res.json();
    setProjects((prev) => [project, ...prev]);
    setDialogOpen(false);
    form.reset();
    navigate(`/projects/${project.id}`);
  };

  const onDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      await fetch(`${API_BASE}/api/website-projects/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <SEO title="Projects — goals.ac" description="Manage content projects, drafts, and publishing." />
      {/* Dashboard hero */}
      <div className="relative bg-muted/30 py-10 border-b border-border overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Choose a site to plan content, review drafts, or check performance{user?.name ? `, ${user.name}` : ""}.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add website
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add a website project</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddProject)} className="space-y-4 mt-2">
                  {form.formState.errors.root && (
                    <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500 border border-red-200 dark:border-red-500/20">
                      {form.formState.errors.root.message}
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Company" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                    ) : (
                      "Add project"
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 max-w-5xl py-10">
        {!isLoadingProjects && projects.length > 0 && (visibilityScore != null || geoScore != null) && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <Link to="/ai-visibility" className="block rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5 p-4 hover:border-violet-300 transition-colors">
              <div className="text-sm font-semibold text-violet-800 dark:text-violet-300">
                AI Visibility
              </div>
              <p className="text-2xl font-bold mt-1">{visibilityScore ?? "—"}%</p>
              <p className="text-xs text-muted-foreground mt-1">Brand citation rate across AI engines</p>
            </Link>
            <Link to="/ai-visibility" className="block rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-4 hover:border-emerald-300 transition-colors">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                GEO Score
              </div>
              <p className="text-2xl font-bold mt-1">{geoScore ?? "—"}<span className="text-base font-normal text-muted-foreground">/100</span></p>
              <p className="text-xs text-muted-foreground mt-1">Latest technical GEO audit</p>
            </Link>
          </div>
        )}

        {drafts.length > 0 && !isLoadingProjects && (
          <div className="mb-8 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-900/10 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                  {drafts.length} draft{drafts.length !== 1 ? "s" : ""} need your review
                </span>
              </div>
              <button type="button"
                onClick={() => setDraftsExpanded((v) => !v)}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
              >
                {draftsExpanded ? "Show less" : "Show all"}
              </button>
            </div>
            <div className="space-y-1">
              {(draftsExpanded ? drafts : drafts.slice(0, 3)).map((d) => (
                <Link
                  key={d.id}
                  to={`/content-piece/${d.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-800/20 transition-colors group"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-200 truncate flex-1">{d.title}</span>
                  {d.projectName && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">{d.projectName}</span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              ))}
              {!draftsExpanded && drafts.length > 3 && (
                <button type="button"
                  onClick={() => setDraftsExpanded(true)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline px-3 py-1"
                >
                  +{drafts.length - 3} more
                </button>
              )}
            </div>
          </div>
        )}

        {isLoadingProjects ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="border shadow-none border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-xl mb-2">No projects yet</CardTitle>
              <CardDescription className="mb-6 max-w-sm">
                Add your first website to start generating SEO content, audits, and growth strategies tailored to your brand.
              </CardDescription>
              <Button
                onClick={() => setDialogOpen(true)}
                className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first website
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DashboardProjectsGrid projects={projects} onDeleteRequest={setDeleteConfirmId} />
        )}
      </div>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the project and all associated data. This action cannot be undone.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={isDeleting}
              onClick={() => deleteConfirmId && onDelete(deleteConfirmId)}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
