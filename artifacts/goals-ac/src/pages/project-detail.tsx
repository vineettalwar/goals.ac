import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/context/auth";
import { Loader2, ExternalLink, Save, FileText, BarChart3, Search, Globe, AlertCircle, Map, Layers, RefreshCw, CheckCircle2, Link2, Unlink, Send, Palette } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Confidence = "high" | "medium" | "low";

interface ScrapeConfidence {
  companyName: Confidence;
  industry: Confidence;
  targetAudience: Confidence;
  voiceTone: Confidence;
  primaryKeywords: Confidence;
  competitorUrls: Confidence;
}

interface ScrapeData {
  confidence?: ScrapeConfidence;
}

interface ContentStyle {
  tonePreset?: "professional" | "casual" | "technical" | "conversational";
  personaName?: string;
  defaultWordCount?: number;
  primaryLanguage?: string;
  forbiddenWords?: string[];
  readingLevel?: "general" | "intermediate" | "expert";
}

interface BrandProfile {
  id: number;
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  competitorUrls: string[];
  updatedAt?: string;
}

interface CmsIntegrationStatus {
  notion?: { connected: boolean; databaseId: string; integrationTokenHint: string };
  webflow?: { connected: boolean; collectionId: string; bodyFieldSlug: string; apiTokenHint: string };
}

interface WebsiteProject {
  id: number;
  name: string;
  url: string;
  sitemapUrl: string | null;
  pageCount: number;
  crawlStatus: string;
  scrapeStatus: string | null;
  scrapeData: ScrapeData | null;
  contentStyle: ContentStyle | null;
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

const contentStyleSchema = z.object({
  tonePreset: z.enum(["professional", "casual", "technical", "conversational"]).optional(),
  personaName: z.string().optional(),
  defaultWordCount: z.number().min(300).max(3000).optional(),
  primaryLanguage: z.string().optional(),
  forbiddenWords: z.string().optional(),
  readingLevel: z.enum(["general", "intermediate", "expert"]).optional(),
});
type ContentStyleForm = z.infer<typeof contentStyleSchema>;

function ConfidenceBadge({ level }: { level: Confidence | undefined }) {
  if (!level) return null;
  const config = {
    high: { label: "High confidence", className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25" },
    medium: { label: "Medium confidence", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25" },
    low: { label: "Low confidence", className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/25" },
  }[level];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${config.className}`}>
      {config.label}
    </span>
  );
}

const TONE_PRESETS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "technical", label: "Technical" },
  { value: "conversational", label: "Conversational" },
] as const;

const READING_LEVELS = [
  { value: "general", label: "General — accessible to everyone" },
  { value: "intermediate", label: "Intermediate — assumes some domain knowledge" },
  { value: "expert", label: "Expert — deep technical audience" },
] as const;

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Portuguese", "Italian",
  "Dutch", "Swedish", "Norwegian", "Danish", "Polish", "Japanese",
  "Korean", "Chinese (Simplified)", "Chinese (Traditional)",
];

const WORD_COUNT_PRESETS = [
  { label: "Short", value: 400 },
  { label: "Medium", value: 800 },
  { label: "Long", value: 1500 },
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [project, setProject] = useState<WebsiteProject | null>(null);
  const [content, setContent] = useState<ProjectContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [saveStyleSuccess, setSaveStyleSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRescanning, setIsRescanning] = useState(false);
  const scrapePollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cmsIntegrations, setCmsIntegrations] = useState<CmsIntegrationStatus>({});
  const [notionToken, setNotionToken] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [webflowToken, setWebflowToken] = useState("");
  const [webflowCollId, setWebflowCollId] = useState("");
  const [webflowBodyField, setWebflowBodyField] = useState("post-body");
  const [isSavingNotion, setIsSavingNotion] = useState(false);
  const [isSavingWebflow, setIsSavingWebflow] = useState(false);
  const [isDisconnectingNotion, setIsDisconnectingNotion] = useState(false);
  const [isDisconnectingWebflow, setIsDisconnectingWebflow] = useState(false);
  const [cmsError, setCmsError] = useState<string | null>(null);
  const [cmsSaveSuccess, setCmsSaveSuccess] = useState<string | null>(null);
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Record<string, { ok: boolean; error?: string }> | null>(null);
  const [activeTab, setActiveTab] = useState("brand");

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

  const styleForm = useForm<ContentStyleForm>({
    resolver: zodResolver(contentStyleSchema),
    defaultValues: {
      tonePreset: undefined,
      personaName: "",
      defaultWordCount: 800,
      primaryLanguage: "English",
      forbiddenWords: "",
      readingLevel: undefined,
    },
  });

  const populateFormFromBrandProfile = useCallback((bp: BrandProfile) => {
    form.reset({
      companyName: bp.companyName,
      industry: bp.industry,
      targetAudience: bp.targetAudience,
      voiceTone: bp.voiceTone,
      primaryKeywords: bp.primaryKeywords.join(", "),
      competitorUrls: bp.competitorUrls.join("\n"),
    });
  }, [form]);

  const populateStyleForm = useCallback((cs: ContentStyle | null) => {
    styleForm.reset({
      tonePreset: cs?.tonePreset ?? undefined,
      personaName: cs?.personaName ?? "",
      defaultWordCount: cs?.defaultWordCount ?? 800,
      primaryLanguage: cs?.primaryLanguage ?? "English",
      forbiddenWords: cs?.forbiddenWords?.join(", ") ?? "",
      readingLevel: cs?.readingLevel ?? undefined,
    });
  }, [styleForm]);

  const safeJson = async <T,>(r: Response): Promise<T | null> => {
    try { return await r.json(); } catch { return null; }
  };

  const fetchProject = useCallback(async (): Promise<WebsiteProject | null> => {
    if (!token || !id) return null;
    const res = await fetch(`${API_BASE}/api/website-projects/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return safeJson<WebsiteProject>(res);
  }, [token, id]);

  const loadCmsIntegrations = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCmsIntegrations(await res.json() as CmsIntegrationStatus);
      }
    } catch { /* ignore */ }
  }, [token, id]);

  const loadProject = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [projData, contentRes] = await Promise.all([
        fetchProject(),
        fetch(`${API_BASE}/api/website-projects/${id}/content`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!projData) {
        setError("Project not found");
        return;
      }

      setProject(projData);

      if (projData.brandProfile) {
        populateFormFromBrandProfile(projData.brandProfile);
      }
      populateStyleForm(projData.contentStyle);

      if (contentRes.ok) {
        setContent(await contentRes.json());
      }

      await loadCmsIntegrations();
    } catch {
      setError("Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }, [token, id, fetchProject, populateFormFromBrandProfile, loadCmsIntegrations, populateStyleForm]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (activeTab !== "publishing" || !token || !id) return;
    const hasCms = cmsIntegrations.notion || cmsIntegrations.webflow;
    if (!hasCms || isTestingHealth) return;
    setIsTestingHealth(true);
    fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations/test`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setHealthStatus(data as Record<string, { ok: boolean; error?: string }>))
      .catch(() => {})
      .finally(() => setIsTestingHealth(false));
  }, [activeTab, token, id, cmsIntegrations.notion, cmsIntegrations.webflow]);

  useEffect(() => {
    if (!project) return;

    const isPending = project.scrapeStatus === "pending";

    if (isPending && !scrapePollerRef.current) {
      scrapePollerRef.current = setInterval(async () => {
        const updated = await fetchProject();
        if (!updated) return;
        setProject(updated);
        if (updated.scrapeStatus !== "pending") {
          if (scrapePollerRef.current) {
            clearInterval(scrapePollerRef.current);
            scrapePollerRef.current = null;
          }
          if (updated.brandProfile) {
            populateFormFromBrandProfile(updated.brandProfile);
          }
          setIsRescanning(false);
        }
      }, 3000);
    }

    if (!isPending && scrapePollerRef.current) {
      clearInterval(scrapePollerRef.current);
      scrapePollerRef.current = null;
    }

    return () => {
      if (scrapePollerRef.current) {
        clearInterval(scrapePollerRef.current);
        scrapePollerRef.current = null;
      }
    };
  }, [project?.scrapeStatus, fetchProject, populateFormFromBrandProfile]);

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

  const onSaveContentStyle = async (data: ContentStyleForm) => {
    if (!token || !id) return;
    setIsSavingStyle(true);
    setSaveStyleSuccess(false);
    try {
      const contentStyle: ContentStyle = {};
      if (data.tonePreset) contentStyle.tonePreset = data.tonePreset;
      if (data.personaName?.trim()) contentStyle.personaName = data.personaName.trim();
      if (data.defaultWordCount) contentStyle.defaultWordCount = data.defaultWordCount;
      if (data.primaryLanguage?.trim()) contentStyle.primaryLanguage = data.primaryLanguage.trim();
      if (data.forbiddenWords?.trim()) {
        contentStyle.forbiddenWords = data.forbiddenWords.split(",").map((w) => w.trim()).filter(Boolean);
      }
      if (data.readingLevel) contentStyle.readingLevel = data.readingLevel;

      const res = await fetch(`${API_BASE}/api/website-projects/${id}/brand-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentStyle }),
      });
      if (res.ok) {
        setProject((prev) => prev ? { ...prev, contentStyle } : prev);
        setSaveStyleSuccess(true);
        setTimeout(() => setSaveStyleSuccess(false), 3000);
      }
    } finally {
      setIsSavingStyle(false);
    }
  };

  const onRescan = async () => {
    if (!token || !id || isRescanning) return;
    setIsRescanning(true);
    setProject((prev) => prev ? { ...prev, scrapeStatus: "pending" } : prev);
    try {
      await fetch(`${API_BASE}/api/website-projects/${id}/scrape-brand`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setIsRescanning(false);
    }
  };

  const onSaveNotion = async () => {
    if (!token || !id || !notionToken.trim() || !notionDbId.trim()) return;
    setIsSavingNotion(true);
    setCmsError(null);
    setCmsSaveSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notion: { integrationToken: notionToken.trim(), databaseId: notionDbId.trim() } }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }
      const updated = await res.json() as CmsIntegrationStatus;
      setCmsIntegrations(updated);
      setNotionToken("");
      setNotionDbId("");
      setCmsSaveSuccess("Notion connected successfully");
      setTimeout(() => setCmsSaveSuccess(null), 3000);
    } catch (err) {
      setCmsError(err instanceof Error ? err.message : "Failed to connect Notion");
    } finally {
      setIsSavingNotion(false);
    }
  };

  const onDisconnectNotion = async () => {
    if (!token || !id) return;
    setIsDisconnectingNotion(true);
    setCmsError(null);
    try {
      await fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations/notion`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCmsIntegrations((prev) => { const n = { ...prev }; delete n.notion; return n; });
    } catch {
      setCmsError("Failed to disconnect Notion");
    } finally {
      setIsDisconnectingNotion(false);
    }
  };

  const onSaveWebflow = async () => {
    if (!token || !id || !webflowToken.trim() || !webflowCollId.trim()) return;
    setIsSavingWebflow(true);
    setCmsError(null);
    setCmsSaveSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ webflow: { apiToken: webflowToken.trim(), collectionId: webflowCollId.trim(), bodyFieldSlug: webflowBodyField.trim() || "post-body" } }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }
      const updated = await res.json() as CmsIntegrationStatus;
      setCmsIntegrations(updated);
      setWebflowToken("");
      setWebflowCollId("");
      setWebflowBodyField("post-body");
      setCmsSaveSuccess("Webflow connected successfully");
      setTimeout(() => setCmsSaveSuccess(null), 3000);
    } catch (err) {
      setCmsError(err instanceof Error ? err.message : "Failed to connect Webflow");
    } finally {
      setIsSavingWebflow(false);
    }
  };

  const onDisconnectWebflow = async () => {
    if (!token || !id) return;
    setIsDisconnectingWebflow(true);
    setCmsError(null);
    try {
      await fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations/webflow`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCmsIntegrations((prev) => { const n = { ...prev }; delete n.webflow; return n; });
      setHealthStatus((prev) => { if (!prev) return prev; const n = { ...prev }; delete n.webflow; return n; });
    } catch {
      setCmsError("Failed to disconnect Webflow");
    } finally {
      setIsDisconnectingWebflow(false);
    }
  };

  const onTestHealth = async () => {
    if (!token || !id) return;
    setIsTestingHealth(true);
    setCmsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHealthStatus(await res.json() as Record<string, { ok: boolean; error?: string }>);
      }
    } catch {
      setCmsError("Failed to test connections");
    } finally {
      setIsTestingHealth(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-6">This project doesn't exist or you don't have access to it.</p>
          <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const isScraping = project.scrapeStatus === "pending" || isRescanning;
  const wasAutoFilled = project.scrapeStatus === "done";
  const scrapeFailed = project.scrapeStatus === "failed" && !isRescanning;
  const confidence = project.scrapeData?.confidence;

  const brandProfileUpdatedAt = project.brandProfile?.updatedAt
    ? new Date(project.brandProfile.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <AppLayout>
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
              <Layers className="w-4 h-4 mr-2" />
              Open Content Studio
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">Generate blog posts, guides, whitepapers, and more — powered by AI.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <TabsTrigger value="publishing">
              Publishing
              {(cmsIntegrations.notion || cmsIntegrations.webflow) && (
                <Badge variant="secondary" className="ml-2 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {(cmsIntegrations.notion ? 1 : 0) + (cmsIntegrations.webflow ? 1 : 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brand" className="space-y-6">
            <Card className="border-white/[0.07] glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Brand Profile</CardTitle>
                    <CardDescription>
                      This information is used to personalize all AI-generated content for your website.
                    </CardDescription>
                    {brandProfileUpdatedAt && (
                      <p className="text-xs text-muted-foreground mt-1">Last updated {brandProfileUpdatedAt}</p>
                    )}
                  </div>
                  {!isScraping && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRescan}
                      className="flex-shrink-0 gap-1.5 text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-scan website
                    </Button>
                  )}
                </div>

                {isScraping && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-400/20 bg-blue-500/[0.07] px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-500 dark:text-blue-400">Analyzing your website…</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Reading your homepage and key pages to pre-fill your brand profile. This takes about 15–30 seconds.</p>
                    </div>
                  </div>
                )}

                {wasAutoFilled && !isScraping && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.07] px-4 py-3">
                    <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Auto-filled from your website — review and save to confirm.
                    </p>
                  </div>
                )}

                {scrapeFailed && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/[0.07] px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-500 dark:text-red-400">Website scan failed</p>
                      <p className="text-xs text-muted-foreground mt-0.5">We couldn't read your website. Fill in the fields manually, or try re-scanning.</p>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isScraping ? (
                  <div className="space-y-6 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-28 rounded bg-muted" />
                        <div className="h-10 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSaveBrandProfile)} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-2">
                                <FormLabel>Company name</FormLabel>
                                {wasAutoFilled && <ConfidenceBadge level={confidence?.companyName} />}
                              </div>
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
                              <div className="flex items-center gap-2">
                                <FormLabel>Industry</FormLabel>
                                {wasAutoFilled && <ConfidenceBadge level={confidence?.industry} />}
                              </div>
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
                            <div className="flex items-center gap-2">
                              <FormLabel>Target audience</FormLabel>
                              {wasAutoFilled && <ConfidenceBadge level={confidence?.targetAudience} />}
                            </div>
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
                            <div className="flex items-center gap-2">
                              <FormLabel>Brand voice &amp; tone</FormLabel>
                              {wasAutoFilled && <ConfidenceBadge level={confidence?.voiceTone} />}
                            </div>
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
                            <div className="flex items-center gap-2">
                              <FormLabel>Primary keywords</FormLabel>
                              {wasAutoFilled && <ConfidenceBadge level={confidence?.primaryKeywords} />}
                            </div>
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
                            <div className="flex items-center gap-2">
                              <FormLabel>Competitor URLs</FormLabel>
                              {wasAutoFilled && <ConfidenceBadge level={confidence?.competitorUrls} />}
                            </div>
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
                        <Button type="submit" disabled={isSaving} className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white">
                          {isSaving ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                          ) : (
                            <><Save className="mr-2 h-4 w-4" />Save brand profile</>
                          )}
                        </Button>
                        {saveSuccess && (
                          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Saved successfully</span>
                        )}
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/[0.07] glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Palette className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Content Style</CardTitle>
                    <CardDescription>
                      Fine-tune the writing persona, tone, and format preferences for all AI-generated content in this project.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...styleForm}>
                  <form onSubmit={styleForm.handleSubmit(onSaveContentStyle)} className="space-y-6">
                    <FormField
                      control={styleForm.control}
                      name="tonePreset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tone preset</FormLabel>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {TONE_PRESETS.map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => field.onChange(field.value === preset.value ? undefined : preset.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                                  field.value === preset.value
                                    ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-300"
                                    : "bg-muted/50 border-border text-foreground hover:border-primary/40 hover:bg-muted"
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={styleForm.control}
                      name="personaName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Writing persona</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='e.g. "Alex, our Head of Growth" or "Dr. Sarah Chen, Chief Research Officer"'
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Give the AI writer a name and role to adopt when generating content</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={styleForm.control}
                      name="defaultWordCount"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between mb-2">
                            <FormLabel>Default word count</FormLabel>
                            <span className="text-sm font-semibold text-foreground">{field.value?.toLocaleString() ?? 800} words</span>
                          </div>
                          <div className="flex gap-2 mb-3">
                            {WORD_COUNT_PRESETS.map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => field.onChange(preset.value)}
                                className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                                  field.value === preset.value
                                    ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-300"
                                    : "bg-muted/50 border-border text-foreground hover:border-primary/40 hover:bg-muted"
                                }`}
                              >
                                {preset.label} ({preset.value})
                              </button>
                            ))}
                          </div>
                          <FormControl>
                            <Slider
                              min={300}
                              max={3000}
                              step={100}
                              value={[field.value ?? 800]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="w-full"
                            />
                          </FormControl>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>300</span>
                            <span>3,000</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={styleForm.control}
                        name="primaryLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary content language</FormLabel>
                            <Select value={field.value ?? "English"} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LANGUAGES.map((lang) => (
                                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={styleForm.control}
                        name="readingLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Audience reading level</FormLabel>
                            <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reading level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Not specified</SelectItem>
                                {READING_LEVELS.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={styleForm.control}
                      name="forbiddenWords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forbidden words &amp; phrases</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="synergy, leverage, disruptive, game-changer, revolutionary"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Comma-separated — the AI will avoid these in all generated content</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-3">
                      <Button type="submit" disabled={isSavingStyle} className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white hover:from-blue-600 hover:to-blue-700">
                        {isSavingStyle ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        ) : (
                          <><Save className="mr-2 h-4 w-4" />Save content style</>
                        )}
                      </Button>
                      {saveStyleSuccess && (
                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Saved successfully</span>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="publishing">
            <div className="space-y-6">
              {cmsError && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{cmsError}</span>
                </div>
              )}
              {cmsSaveSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3 border border-emerald-200 dark:border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{cmsSaveSuccess}</span>
                </div>
              )}
              {(cmsIntegrations.notion || cmsIntegrations.webflow) && (
                <div className="flex items-center justify-end">
                  <Button variant="outline" size="sm" onClick={onTestHealth} disabled={isTestingHealth}>
                    {isTestingHealth ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                    Test connections
                  </Button>
                </div>
              )}

              {/* Notion */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="w-5 h-5 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-white dark:text-zinc-900">N</span>
                        Notion
                        {cmsIntegrations.notion && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />Connected
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Publish content directly to a Notion database as a new page.
                      </CardDescription>
                    </div>
                    {cmsIntegrations.notion && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onDisconnectNotion}
                        disabled={isDisconnectingNotion}
                        className="flex-shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
                      >
                        {isDisconnectingNotion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5 mr-1.5" />}
                        Disconnect
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {cmsIntegrations.notion ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Database ID:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{cmsIntegrations.notion.databaseId}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Token:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{cmsIntegrations.notion.integrationTokenHint}</code>
                      </div>
                      {healthStatus?.notion && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium mt-1 ${healthStatus.notion.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                          {healthStatus.notion.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {healthStatus.notion.ok ? "Connection healthy" : healthStatus.notion.error}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">To update credentials, disconnect first then re-connect.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Integration Token</label>
                        <Input
                          type="password"
                          placeholder="secret_..."
                          value={notionToken}
                          onChange={(e) => setNotionToken(e.target.value)}
                          disabled={isSavingNotion}
                        />
                        <p className="text-xs text-muted-foreground">
                          Create an integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">notion.so/my-integrations</a> and share your database with it.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Database ID</label>
                        <Input
                          placeholder="32-character hex ID from your database URL"
                          value={notionDbId}
                          onChange={(e) => setNotionDbId(e.target.value)}
                          disabled={isSavingNotion}
                        />
                        <p className="text-xs text-muted-foreground">Found in your database URL: notion.so/your-workspace/<strong>{"<database-id>"}</strong>?v=...</p>
                      </div>
                      <Button
                        onClick={onSaveNotion}
                        disabled={!notionToken.trim() || !notionDbId.trim() || isSavingNotion}
                        size="sm"
                      >
                        {isSavingNotion ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Connecting…</> : <><Link2 className="w-3.5 h-3.5 mr-1.5" />Connect Notion</>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Webflow */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">W</span>
                        Webflow
                        {cmsIntegrations.webflow && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />Connected
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Publish content as a draft CMS item in your Webflow collection.
                      </CardDescription>
                    </div>
                    {cmsIntegrations.webflow && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onDisconnectWebflow}
                        disabled={isDisconnectingWebflow}
                        className="flex-shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
                      >
                        {isDisconnectingWebflow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5 mr-1.5" />}
                        Disconnect
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {cmsIntegrations.webflow ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Collection ID:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{cmsIntegrations.webflow.collectionId}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Body field:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{cmsIntegrations.webflow.bodyFieldSlug}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Token:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{cmsIntegrations.webflow.apiTokenHint}</code>
                      </div>
                      {healthStatus?.webflow && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium mt-1 ${healthStatus.webflow.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                          {healthStatus.webflow.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {healthStatus.webflow.ok ? "Connection healthy" : healthStatus.webflow.error}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">To update credentials, disconnect first then re-connect.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">API Token</label>
                        <Input
                          type="password"
                          placeholder="Webflow site API token"
                          value={webflowToken}
                          onChange={(e) => setWebflowToken(e.target.value)}
                          disabled={isSavingWebflow}
                        />
                        <p className="text-xs text-muted-foreground">
                          Found in Webflow: <strong>Site Settings → Integrations → API access</strong>
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Collection ID</label>
                        <Input
                          placeholder="64-character collection ID"
                          value={webflowCollId}
                          onChange={(e) => setWebflowCollId(e.target.value)}
                          disabled={isSavingWebflow}
                        />
                        <p className="text-xs text-muted-foreground">Found in your Webflow CMS collection URL.</p>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Body field slug</label>
                        <Input
                          placeholder="post-body"
                          value={webflowBodyField}
                          onChange={(e) => setWebflowBodyField(e.target.value)}
                          disabled={isSavingWebflow}
                        />
                        <p className="text-xs text-muted-foreground">The slug of the Rich Text field in your collection that holds content (default: <code>post-body</code>).</p>
                      </div>
                      <Button
                        onClick={onSaveWebflow}
                        disabled={!webflowToken.trim() || !webflowCollId.trim() || isSavingWebflow}
                        size="sm"
                      >
                        {isSavingWebflow ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Connecting…</> : <><Link2 className="w-3.5 h-3.5 mr-1.5" />Connect Webflow</>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WordPress note */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">W</span>
                    WordPress
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Publish content directly to any WordPress site using Application Passwords.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Send className="w-4 h-4 flex-shrink-0" />
                    <span>WordPress credentials are entered per-publish. Open a content piece and click <strong>Publish</strong> to connect.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content">
            <div className="space-y-6">
              {content && content.seoArticles.length > 0 && (
                <Card className="border-white/[0.07] glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      SEO Articles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {content.seoArticles.map((article) => (
                        <div key={article.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{article.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{article.primaryKeyword} · {article.wordCount} words</p>
                          </div>
                          <Button size="sm" variant="ghost" asChild className="hover:bg-muted dark:hover:bg-white/[0.07]">
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
                      <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      Content Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {content.contentStrategies.map((strategy) => (
                        <div key={strategy.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{strategy.industry} · {strategy.location}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{strategy.stage}</p>
                          </div>
                          <Button size="sm" variant="ghost" asChild className="hover:bg-muted dark:hover:bg-white/[0.07]">
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
                      <Search className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      GEO Audits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {content.geoAudits.map((audit) => (
                        <div key={audit.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{audit.url.replace(/^https?:\/\//, "")}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">GEO Score: <span className="text-blue-600 dark:text-blue-400 font-semibold">{audit.geoScore}/100</span></p>
                          </div>
                          <Button size="sm" variant="ghost" asChild className="hover:bg-muted dark:hover:bg-white/[0.07]">
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
                      <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Growth Roadmaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {content.roadmaps.map((roadmap) => (
                        <div key={roadmap.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{roadmap.industry} · {roadmap.location}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{roadmap.stage} stage</p>
                          </div>
                          <Button size="sm" variant="ghost" asChild className="hover:bg-muted dark:hover:bg-white/[0.07]">
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
                      <FileText className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-lg mb-2">No content yet</CardTitle>
                    <CardDescription className="max-w-sm mb-6">
                      Use the tools on the home page to generate roadmaps, content strategies, SEO articles, and GEO audits. They'll appear here when you're logged in.
                    </CardDescription>
                    <Button className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white" asChild>
                      <Link to="/">Generate content</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
