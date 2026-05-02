import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth";
import { Loader2, Plus, Globe, ExternalLink, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WebsiteProject {
  id: number;
  name: string;
  url: string;
  sitemapUrl: string | null;
  pageCount: number;
  crawlStatus: string;
  createdAt: string;
}

const addProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Must be a valid URL (e.g., https://example.com)"),
});
type AddProjectForm = z.infer<typeof addProjectSchema>;

function CrawlStatusBadge({ status }: { status: string }) {
  if (status === "done") return (
    <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/25">
      <CheckCircle2 className="w-3 h-3 mr-1" />Crawled
    </Badge>
  );
  if (status === "failed") return (
    <Badge className="bg-red-500/15 text-red-300 border-red-500/25">
      <XCircle className="w-3 h-3 mr-1" />Failed
    </Badge>
  );
  return (
    <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25">
      <Clock className="w-3 h-3 mr-1" />Crawling...
    </Badge>
  );
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        const data = await res.json();
        setProjects(data);
      }
    } finally {
      setIsLoadingProjects(false);
    }
  }, [token]);

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
    <Layout>
      <SEO title="Dashboard — goals.ac" description="Manage your website SEO projects." />
      {/* Dashboard hero */}
      <div className="relative bg-mesh-dark text-zinc-50 py-12 border-b border-white/[0.06] overflow-hidden">
        <div className="orb orb-primary w-[500px] h-[350px] top-[-20%] left-[40%] -translate-x-1/2" />
        <div className="orb orb-violet w-[250px] h-[250px] bottom-[-10%] right-[5%]" />
        <div className="container relative z-10 mx-auto px-4 md:px-8 max-w-5xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Your Projects</h1>
            <p className="text-zinc-400 mt-1">Welcome back, <span className="text-zinc-200 font-medium">{user?.name}</span></p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add website
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md glass-card border-white/10">
              <DialogHeader>
                <DialogTitle>Add a website project</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddProject)} className="space-y-4 mt-2">
                  {form.formState.errors.root && (
                    <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
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
                          <Input placeholder="My Company" className="bg-white/5 border-white/10" {...field} />
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
                          <Input type="url" placeholder="https://example.com" className="bg-white/5 border-white/10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white" disabled={form.formState.isSubmitting}>
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
        {isLoadingProjects ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-white/[0.07] glass-card shadow-none border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full glass-card-md flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-blue-400" />
              </div>
              <CardTitle className="text-xl mb-2">No projects yet</CardTitle>
              <CardDescription className="mb-6 max-w-sm">
                Add your first website to start generating SEO content, audits, and growth strategies tailored to your brand.
              </CardDescription>
              <Button
                onClick={() => setDialogOpen(true)}
                className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first website
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="group border-white/[0.07] glass-card-md shadow-none card-hover-glow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-blue-400 transition-colors mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{project.url.replace(/^https?:\/\//, "")}</span>
                      </a>
                    </div>
                    <CrawlStatusBadge status={project.crawlStatus} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {project.pageCount > 0 ? (
                        <span>{project.pageCount} pages found</span>
                      ) : (
                        <span>Sitemap analysis pending</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => setDeleteConfirmId(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" asChild className="bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30">
                        <Link to={`/projects/${project.id}`}>Open</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the project and all associated data. This action cannot be undone.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1 border-white/10 bg-white/5" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
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
    </Layout>
  );
}
