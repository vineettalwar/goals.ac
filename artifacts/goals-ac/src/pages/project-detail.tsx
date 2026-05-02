import { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth";
import { Loader2, ExternalLink, Save, FileText, BarChart3, Search, Globe, AlertCircle, Map, Sparkles } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BrandProfile {
  id: number;
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  competitorUrls: string[];
}

interface WebsiteProject {
  id: number;
  name: string;
  url: string;
  sitemapUrl: string | null;
  pageCount: number;
  crawlStatus: string;
  createdAt: string;
  brandProfile: BrandProfile | null;
}

interface ProjectContent {
  contentStrategies: Array<{ id: number; industry: string; location: string; stage: string; createdAt: string }>;
  seoArticles: Array<{ id: number; title: string; primaryKeyword: string; wordCount: number; status: string; createdAt: string }>;
  geoAudits: Array<{ id: number; url: string; geoScore: number; createdAt: string }>;
  roadmaps: Array<{ id: number; slug: string; industry: string; location: string; stage: string; createdAt: string }>;
}

const brandProfileSchema = z.object({
  companyName: z.string(),
  industry: z.string(),
  targetAudience: z.string(),
  voiceTone: z.string(),
  primaryKeywords: z.string(),
  competitorUrls: z.string(),
});
type BrandProfileForm = z.infer<typeof brandProfileSchema>;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [project, setProject] = useState<WebsiteProject | null>(null);
  const [content, setContent] = useState<ProjectContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<BrandProfileForm>({
    resolver: zodResolver(brandProfileSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      targetAudience: "",
      voiceTone: "",
      primaryKeywords: "",
      competitorUrls: "",
    },
  });

  const loadProject = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [projRes, contentRes] = await Promise.all([
        fetch(`${API_BASE}/api/website-projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/website-projects/${id}/content`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!projRes.ok) {
        setError("Project not found");
        return;
      }

      const projData: WebsiteProject = await projRes.json();
      setProject(projData);

      if (projData.brandProfile) {
        form.reset({
          companyName: projData.brandProfile.companyName,
          industry: projData.brandProfile.industry,
          targetAudience: projData.brandProfile.targetAudience,
          voiceTone: projData.brandProfile.voiceTone,
          primaryKeywords: projData.brandProfile.primaryKeywords.join(", "),
          competitorUrls: projData.brandProfile.competitorUrls.join("\n"),
        });
      }

      if (contentRes.ok) {
        setContent(await contentRes.json());
      }
    } catch {
      setError("Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }, [token, id, form]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const onSaveBrandProfile = async (data: BrandProfileForm) => {
    if (!token || !id) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${id}/brand-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyName: data.companyName,
          industry: data.industry,
          targetAudience: data.targetAudience,
          voiceTone: data.voiceTone,
          primaryKeywords: data.primaryKeywords.split(",").map((k) => k.trim()).filter(Boolean),
          competitorUrls: data.competitorUrls.split("\n").map((u) => u.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const bp = await res.json();
        setProject((prev) => prev ? { ...prev, brandProfile: bp } : prev);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-6">This project doesn't exist or you don't have access to it.</p>
          <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title={`${project.name} — goals.ac`} description={`SEO project for ${project.url}`} />
      <div className="container mx-auto px-4 md:px-8 max-w-5xl py-12">
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-1">
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1">
              ← Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                {project.url.replace(/^https?:\/\//, "")}
              </a>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {project.pageCount > 0 && (
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {project.pageCount} pages
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <Link to={`/projects/${id}/content-studio`}>
            <Button className="w-full sm:w-auto" size="lg">
              <Sparkles className="w-4 h-4 mr-2" />
              Open Content Studio
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">Generate blog posts, guides, whitepapers, and more — powered by AI.</p>
        </div>

        <Tabs defaultValue="brand">
          <TabsList className="mb-8">
            <TabsTrigger value="brand">Brand Profile</TabsTrigger>
            <TabsTrigger value="content">
              Your Content
              {content && (content.contentStrategies.length + content.seoArticles.length + content.geoAudits.length + (content.roadmaps?.length ?? 0)) > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  {content.contentStrategies.length + content.seoArticles.length + content.geoAudits.length + (content.roadmaps?.length ?? 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brand">
            <Card className="border-white/[0.07] glass-card-md shadow-none">
              <CardHeader>
                <CardTitle>Brand Profile</CardTitle>
                <CardDescription>
                  This information is used to personalize all AI-generated content for your website.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSaveBrandProfile)} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company name</FormLabel>
                            <FormControl>
                              <Input placeholder="Acme Corp" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <FormControl>
                              <Input placeholder="B2B SaaS, E-commerce, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target audience</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your ideal customers — their role, company size, pain points, etc."
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="voiceTone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand voice &amp; tone</FormLabel>
                          <FormControl>
                            <Input placeholder="Professional yet approachable, data-driven, conversational..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="primaryKeywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary keywords</FormLabel>
                          <FormControl>
                            <Input placeholder="keyword one, keyword two, keyword three" {...field} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">Comma-separated list of your main target keywords</p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="competitorUrls"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Competitor URLs</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={"https://competitor1.com\nhttps://competitor2.com"}
                              className="resize-none font-mono text-sm"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">One URL per line</p>
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center gap-3">
                      <Button type="submit" disabled={isSaving} className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white">
                        {isSaving ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        ) : (
                          <><Save className="mr-2 h-4 w-4" />Save brand profile</>
                        )}
                      </Button>
                      {saveSuccess && (
                        <span className="text-sm text-emerald-400 font-medium">Saved successfully</span>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <div className="space-y-6">
              {content && content.seoArticles.length > 0 && (
                <Card className="border-white/[0.07] glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="w-4 h-4 text-blue-400" />
                      SEO Articles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-white/[0.05]">
                      {content.seoArticles.map((article) => (
                        <div key={article.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{article.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{article.primaryKeyword} · {article.wordCount} words</p>
                          </div>
                          <Button size="sm" variant="ghost" asChild className="hover:bg-white/10">
                            <Link to={`/seo-article/${article.id}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content && content.contentStrategies.length > 0 && (
                <Card className="border-white/[0.07] glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Content Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-white/[0.05]">
                      {content.contentStrategies.map((strategy) => (
                        <div key={strategy.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{strategy.industry} · {strategy.location}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{strategy.stage}</p>
                          </div>
                          <Button size="sm" variant="ghost" asChild className="hover:bg-white/10">
                            <Link to={`/content-strategy/${strategy.id}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content && content.geoAudits.length > 0 && (
                <Card className="border-white/[0.07] glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Search className="w-4 h-4 text-sky-400" />
                      GEO Audits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-white/[0.05]">
                      {content.geoAudits.map((audit) => (
                        <div key={audit.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{audit.url.replace(/^https?:\/\//, "")}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">GEO Score: <span className="text-blue-400 font-semibold">{audit.geoScore}/100</span></p>
                          </div>
                          <Button size="sm" variant="ghost" asChild className="hover:bg-white/10">
                            <Link to={`/geo-audit/${audit.id}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content && content.roadmaps && content.roadmaps.length > 0 && (
                <Card className="border-white/[0.07] glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Map className="w-4 h-4 text-emerald-400" />
                      Growth Roadmaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-white/[0.05]">
                      {content.roadmaps.map((roadmap) => (
                        <div key={roadmap.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{roadmap.industry} · {roadmap.location}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{roadmap.stage} stage</p>
                          </div>
                          <Button size="sm" variant="ghost" asChild className="hover:bg-white/10">
                            <Link to={`/roadmap/${roadmap.slug}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content && content.contentStrategies.length === 0 && content.seoArticles.length === 0 && content.geoAudits.length === 0 && (!content.roadmaps || content.roadmaps.length === 0) && (
                <Card className="border-white/[0.07] glass-card border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-full glass-card-md flex items-center justify-center mb-4">
                      <FileText className="w-7 h-7 text-blue-400" />
                    </div>
                    <CardTitle className="text-lg mb-2">No content yet</CardTitle>
                    <CardDescription className="max-w-sm mb-6">
                      Use the tools on the home page to generate roadmaps, content strategies, SEO articles, and GEO audits. They'll appear here when you're logged in.
                    </CardDescription>
                    <Button className="glow-primary bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white" asChild>
                      <Link to="/">Generate content</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
