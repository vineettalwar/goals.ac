import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SEO } from "@/components/seo";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/context/auth";
import {
  Loader2,
  ExternalLink,
  Save,
  FileText,
  BarChart3,
  Search,
  Globe,
  AlertCircle,
  Map,
  Layers,
  RefreshCw,
  CheckCircle2,
  Palette,
  Plus,
  Trash2,
  Zap,
  Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  PublishingSettingsPanel,
  type CmsIntegrationStatus,
} from "@/components/publishing-settings-panel";
import {
  countPublishingConnections,
  hasAnyPublishingConnection,
} from "@/lib/publishing-destinations";

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

interface AutopilotSettings {
  enabled: boolean;
  cadence: "daily" | "weekly";
  timezone: string;
  publishMode: "manual" | "draft" | "live";
  preferredRunHour: number;
  lastRunAt?: string;
  autoQueueOpportunities?: boolean;
  opportunityScoreThreshold?: number;
}

interface VisibilitySettings {
  llmTrackingEnabled: boolean;
  geoReauditEnabled: boolean;
  lastVisibilityCheckAt?: string;
  lastGeoReauditAt?: string;
}

interface BrandProfile {
  id: number;
  companyName: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  primaryKeywords: string[];
  competitorUrls: string[];
  // Brand Voice Storage Fields (Phase 1)
  writingExamples?: string[];
  brandGlossary?: string[];
  antiPatterns?: string[];
  typicalStructure?: string;
  doWords?: string[];
  dontWords?: string[];
  updatedAt?: string;
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
  autopilotSettings?: AutopilotSettings | null;
  visibilitySettings?: VisibilitySettings | null;
  createdAt: string;
  brandProfile: BrandProfile | null;
}

interface ProjectContent {
  contentStrategies: Array<{
    id: number;
    industry: string;
    location: string;
    stage: string;
    createdAt: string;
  }>;
  seoArticles: Array<{
    id: number;
    title: string;
    primaryKeyword: string;
    wordCount: number;
    status: string;
    createdAt: string;
  }>;
  geoAudits: Array<{
    id: number;
    url: string;
    geoScore: number;
    createdAt: string;
  }>;
  roadmaps: Array<{
    id: number;
    slug: string;
    industry: string;
    location: string;
    stage: string;
    createdAt: string;
  }>;
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
  tonePreset: z
    .enum(["professional", "casual", "technical", "conversational"])
    .optional(),
  personaName: z.string().optional(),
  defaultWordCount: z.number().min(300).max(3000).optional(),
  primaryLanguage: z.string().optional(),
  forbiddenWords: z.string().optional(),
  readingLevel: z.enum(["general", "intermediate", "expert"]).optional(),
});
type ContentStyleForm = z.infer<typeof contentStyleSchema>;

const brandVoiceSchema = z.object({
  writingExamples: z.array(z.string()).optional().default([]),
  brandGlossary: z.array(z.string()).optional().default([]),
  antiPatterns: z.array(z.string()).optional().default([]),
  typicalStructure: z.string().optional().default(""),
  doWords: z.array(z.string()).optional().default([]),
  dontWords: z.array(z.string()).optional().default([]),
});
type BrandVoiceForm = z.infer<typeof brandVoiceSchema>;

type VoiceStringListName =
  | "brandGlossary"
  | "antiPatterns"
  | "doWords"
  | "dontWords";

function VoiceStringListField({
  label,
  description,
  emptyDescription,
  placeholder,
  addFirstLabel,
  addAnotherLabel,
  maxItems,
  name,
  control,
  values,
  onAppend,
  onRemove,
}: {
  label: string;
  description: string;
  emptyDescription: string;
  placeholder: string;
  addFirstLabel: string;
  addAnotherLabel: string;
  maxItems: number;
  name: VoiceStringListName;
  control: Control<BrandVoiceForm>;
  values: string[];
  onAppend: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <label className="text-sm font-medium">{label}</label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {values.length > 0 && (
          <Badge variant="secondary" className="shrink-0">
            {values.length}/{maxItems}
          </Badge>
        )}
      </div>

      {values.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground mb-3 max-w-sm mx-auto">
            {emptyDescription}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onAppend}>
            <Plus className="w-4 h-4 mr-1.5" />
            {addFirstLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {values.map((_, index) => (
            <div key={`${name}-${index}`} className="flex items-center gap-2">
              <FormField
                control={control}
                name={`${name}.${index}`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} placeholder={placeholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {values.length > 0 && values.length < maxItems && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={onAppend}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {addAnotherLabel}
        </Button>
      )}
    </div>
  );
}

function ConfidenceBadge({ level }: { level: Confidence | undefined }) {
  if (!level) return null;
  const config = {
    high: {
      label: "High confidence",
      className:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25",
    },
    medium: {
      label: "Medium confidence",
      className:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25",
    },
    low: {
      label: "Low confidence",
      className:
        "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-400 dark:border-zinc-500/25",
    },
  }[level];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${config.className}`}
    >
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
  { value: "general", label: "General (accessible to everyone)" },
  {
    value: "intermediate",
    label: "Intermediate (assumes some domain knowledge)",
  },
  { value: "expert", label: "Expert (deep technical audience)" },
] as const;

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Polish",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
];

const WORD_COUNT_PRESETS = [
  { label: "Short", value: 400 },
  { label: "Medium", value: 800 },
  { label: "Long", value: 1500 },
];

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const RUN_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${hour.toString().padStart(2, "0")}:00`,
}));

const DEFAULT_AUTOPILOT: AutopilotSettings = {
  enabled: false,
  cadence: "daily",
  timezone: "UTC",
  publishMode: "draft",
  preferredRunHour: 9,
  autoQueueOpportunities: false,
  opportunityScoreThreshold: 60,
};

const DEFAULT_VISIBILITY: VisibilitySettings = {
  llmTrackingEnabled: false,
  geoReauditEnabled: false,
};

const PROJECT_TABS = ["brand", "voice", "content", "publishing"] as const;
type ProjectTab = (typeof PROJECT_TABS)[number];

function isProjectTab(value: string | undefined): value is ProjectTab {
  return PROJECT_TABS.includes(value as ProjectTab);
}

export default function ProjectDetail() {
  const { id, tab: tabParam } = useParams<{ id: string; tab?: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const activeTab: ProjectTab = isProjectTab(tabParam) ? tabParam : "brand";
  const [project, setProject] = useState<WebsiteProject | null>(null);
  const [content, setContent] = useState<ProjectContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [saveStyleSuccess, setSaveStyleSuccess] = useState(false);
  const [, setIsSavingVoice] = useState(false);
  const [, setSaveVoiceSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRescanning, setIsRescanning] = useState(false);
  const scrapePollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cmsIntegrations, setCmsIntegrations] = useState<CmsIntegrationStatus>(
    {},
  );
  const [autopilotSettings, setAutopilotSettings] = useState<AutopilotSettings>(DEFAULT_AUTOPILOT);
  const [isSavingAutopilot, setIsSavingAutopilot] = useState(false);
  const [autopilotSaveSuccess, setAutopilotSaveSuccess] = useState(false);
  const [autopilotError, setAutopilotError] = useState<string | null>(null);
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [visibilitySaveSuccess, setVisibilitySaveSuccess] = useState(false);
  const [isDisconnectingLinkedin, setIsDisconnectingLinkedin] = useState(false);
  const [isDisconnectingTwitter, setIsDisconnectingTwitter] = useState(false);
  const [isDisconnectingMeta, setIsDisconnectingMeta] = useState(false);
  const [metaPageToken, setMetaPageToken] = useState<string | null>(null);
  const [metaPages, setMetaPages] = useState<Array<{
    pageId: string;
    pageName: string;
    instagramAccountId?: string;
    instagramUsername?: string;
  }>>([]);
  const [isSelectingMetaPage, setIsSelectingMetaPage] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cmsError, setCmsError] = useState<string | null>(null);
  const [cmsSaveSuccess, setCmsSaveSuccess] = useState<string | null>(null);
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Record<
    string,
    { ok: boolean; error?: string }
  > | null>(null);
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

  const voiceForm = useForm<BrandVoiceForm>({
    resolver: zodResolver(brandVoiceSchema),
    defaultValues: {
      writingExamples: [],
      brandGlossary: [],
      antiPatterns: [],
      typicalStructure: "",
      doWords: [],
      dontWords: [],
    },
  });

  const MAX_WRITING_EXAMPLES = 5;
  const writingExamples = voiceForm.watch("writingExamples") ?? [];

  const appendWritingExample = () => {
    if (writingExamples.length >= MAX_WRITING_EXAMPLES) return;
    voiceForm.setValue("writingExamples", [...writingExamples, ""], {
      shouldDirty: true,
    });
  };

  const removeWritingExample = (index: number) => {
    voiceForm.setValue(
      "writingExamples",
      writingExamples.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  const MAX_VOICE_TERMS = 20;
  const brandGlossary = voiceForm.watch("brandGlossary") ?? [];
  const antiPatterns = voiceForm.watch("antiPatterns") ?? [];
  const doWords = voiceForm.watch("doWords") ?? [];
  const dontWords = voiceForm.watch("dontWords") ?? [];

  const appendVoiceListItem = (
    name: VoiceStringListName,
    items: string[],
  ) => {
    if (items.length >= MAX_VOICE_TERMS) return;
    voiceForm.setValue(name, [...items, ""], { shouldDirty: true });
  };

  const removeVoiceListItem = (
    name: VoiceStringListName,
    items: string[],
    index: number,
  ) => {
    voiceForm.setValue(
      name,
      items.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  const populateFormFromBrandProfile = useCallback(
    (bp: BrandProfile) => {
      form.reset({
        companyName: bp.companyName,
        industry: bp.industry,
        targetAudience: bp.targetAudience,
        voiceTone: bp.voiceTone,
        primaryKeywords: bp.primaryKeywords.join(", "),
        competitorUrls: bp.competitorUrls.join("\n"),
      });
    },
    [form],
  );

  const populateStyleForm = useCallback(
    (cs: ContentStyle | null) => {
      styleForm.reset({
        tonePreset: cs?.tonePreset ?? undefined,
        personaName: cs?.personaName ?? "",
        defaultWordCount: cs?.defaultWordCount ?? 800,
        primaryLanguage: cs?.primaryLanguage ?? "English",
        forbiddenWords: cs?.forbiddenWords?.join(", ") ?? "",
        readingLevel: cs?.readingLevel ?? undefined,
      });
    },
    [styleForm],
  );

  const populateVoiceForm = useCallback(
    (bp: BrandProfile) => {
      voiceForm.reset({
        writingExamples: bp.writingExamples ?? [],
        brandGlossary: bp.brandGlossary ?? [],
        antiPatterns: bp.antiPatterns ?? [],
        typicalStructure: bp.typicalStructure ?? "",
        doWords: bp.doWords ?? [],
        dontWords: bp.dontWords ?? [],
      });
    },
    [voiceForm],
  );

  const safeJson = async <T,>(r: Response): Promise<T | null> => {
    try {
      return await r.json();
    } catch {
      return null;
    }
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
      const res = await fetch(
        `${API_BASE}/api/website-projects/${id}/cms-integrations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        setCmsIntegrations((await res.json()) as CmsIntegrationStatus);
      }
    } catch {
      /* ignore */
    }
  }, [token, id]);

  const loadProject = useCallback(async () => {
    if (!token || !id) return;
    try {
      const [projData, contentRes] = await Promise.all([
        fetchProject(),
        fetch(`${API_BASE}/api/website-projects/${id}/content`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!projData) {
        setError("Project not found");
        return;
      }

      setProject(projData);

      if (projData.autopilotSettings) {
        setAutopilotSettings({ ...DEFAULT_AUTOPILOT, ...projData.autopilotSettings });
      } else {
        setAutopilotSettings(DEFAULT_AUTOPILOT);
      }

      if (projData.visibilitySettings) {
        setVisibilitySettings({ ...DEFAULT_VISIBILITY, ...projData.visibilitySettings });
      } else {
        setVisibilitySettings(DEFAULT_VISIBILITY);
      }

      if (projData.brandProfile) {
        populateFormFromBrandProfile(projData.brandProfile);
        populateVoiceForm(projData.brandProfile);
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
  }, [
    token,
    id,
    fetchProject,
    populateFormFromBrandProfile,
    loadCmsIntegrations,
    populateStyleForm,
  ]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (!id) return;
    if (!tabParam || !isProjectTab(tabParam)) {
      navigate(`/projects/${id}/brand`, { replace: true });
    }
  }, [id, tabParam, navigate]);

  useEffect(() => {
    if (activeTab !== "publishing" || !token || !id) return;
    if (!hasAnyPublishingConnection(cmsIntegrations) || isTestingHealth) return;
    setIsTestingHealth(true);
    fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations/test`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setHealthStatus(data);
      })
      .catch(() => {})
      .finally(() => setIsTestingHealth(false));
  }, [activeTab, token, id, cmsIntegrations]);

  useEffect(() => {
    if (!token || !id) return;
    const linkedin = searchParams.get("linkedin");
    const twitter = searchParams.get("twitter");
    const meta = searchParams.get("meta");
    const metaToken = searchParams.get("token");

    if (linkedin === "connected") {
      setCmsSaveSuccess("LinkedIn connected successfully");
      loadCmsIntegrations();
      setSearchParams({}, { replace: true });
    } else if (linkedin === "error") {
      setCmsError("LinkedIn connection failed");
      setSearchParams({}, { replace: true });
    }

    if (twitter === "connected") {
      setCmsSaveSuccess("X connected successfully");
      loadCmsIntegrations();
      setSearchParams({}, { replace: true });
    } else if (twitter === "error") {
      setCmsError("X connection failed");
      setSearchParams({}, { replace: true });
    }

    if (meta === "select_page" && metaToken) {
      setMetaPageToken(metaToken);
      fetch(`${API_BASE}/api/auth/meta/pages?token=${encodeURIComponent(metaToken)}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { pages?: typeof metaPages } | null) => {
          if (data?.pages) setMetaPages(data.pages);
        })
        .catch(() => setCmsError("Failed to load Facebook Pages"));
      setSearchParams({}, { replace: true });
    } else if (meta === "connected") {
      setCmsSaveSuccess("Meta connected successfully");
      loadCmsIntegrations();
      setSearchParams({}, { replace: true });
    } else if (meta === "error" || meta === "no_pages") {
      setCmsError(meta === "no_pages" ? "No Facebook Pages found on this account" : "Meta connection failed");
      setSearchParams({}, { replace: true });
    }
  }, [token, id, searchParams, loadCmsIntegrations, setSearchParams]);

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
      const res = await fetch(
        `${API_BASE}/api/website-projects/${id}/brand-profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            companyName: data.companyName,
            industry: data.industry,
            targetAudience: data.targetAudience,
            voiceTone: data.voiceTone,
            primaryKeywords: data.primaryKeywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
            competitorUrls: data.competitorUrls
              .split("\n")
              .map((u) => u.trim())
              .filter(Boolean),
          }),
        },
      );
      if (res.ok) {
        const bp = await res.json();
        setProject((prev) => (prev ? { ...prev, brandProfile: bp } : prev));
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
      if (data.personaName?.trim())
        contentStyle.personaName = data.personaName.trim();
      if (data.defaultWordCount)
        contentStyle.defaultWordCount = data.defaultWordCount;
      if (data.primaryLanguage?.trim())
        contentStyle.primaryLanguage = data.primaryLanguage.trim();
      if (data.forbiddenWords?.trim()) {
        contentStyle.forbiddenWords = data.forbiddenWords
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean);
      }
      if (data.readingLevel) contentStyle.readingLevel = data.readingLevel;

      const res = await fetch(
        `${API_BASE}/api/website-projects/${id}/brand-profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ contentStyle }),
        },
      );
      if (res.ok) {
        setProject((prev) => (prev ? { ...prev, contentStyle } : prev));
        setSaveStyleSuccess(true);
        setTimeout(() => setSaveStyleSuccess(false), 3000);
      }
    } finally {
      setIsSavingStyle(false);
    }
  };

  const onSaveBrandVoice = async (data: BrandVoiceForm) => {
    if (!token || !id) return;
    setIsSavingVoice(true);
    setSaveVoiceSuccess(false);
    try {
      const res = await fetch(
        `${API_BASE}/api/website-projects/${id}/brand-profile/voice`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        },
      );
      if (res.ok) {
        const voiceData = await res.json();
        setProject((prev) =>
          prev
            ? { ...prev, brandProfile: { ...prev.brandProfile, ...voiceData } }
            : prev,
        );
        setSaveVoiceSuccess(true);
        setTimeout(() => setSaveVoiceSuccess(false), 3000);
      }
    } finally {
      setIsSavingVoice(false);
    }
  };

  const onSaveAutopilot = async () => {
    if (!token || !id) return;
    setIsSavingAutopilot(true);
    setAutopilotSaveSuccess(false);
    setAutopilotError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${id}/autopilot-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(autopilotSettings),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAutopilotError((data as { error?: string }).error ?? "Failed to save autopilot settings");
        return;
      }
      const saved = (await res.json()) as AutopilotSettings;
      setAutopilotSettings(saved);
      setProject((prev) => (prev ? { ...prev, autopilotSettings: saved } : prev));
      setAutopilotSaveSuccess(true);
      setTimeout(() => setAutopilotSaveSuccess(false), 3000);
    } catch {
      setAutopilotError("Failed to save autopilot settings");
    } finally {
      setIsSavingAutopilot(false);
    }
  };

  const onSaveVisibility = async () => {
    if (!token || !id) return;
    setIsSavingVisibility(true);
    setVisibilitySaveSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${id}/visibility-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(visibilitySettings),
      });
      if (!res.ok) return;
      const saved = (await res.json()) as VisibilitySettings;
      setVisibilitySettings(saved);
      setProject((prev) => (prev ? { ...prev, visibilitySettings: saved } : prev));
      setVisibilitySaveSuccess(true);
      setTimeout(() => setVisibilitySaveSuccess(false), 3000);
    } finally {
      setIsSavingVisibility(false);
    }
  };

  const onAnalyzeWritingExamples = async () => {
    if (!token || !id) return;
    const writingExamples = voiceForm.getValues("writingExamples") ?? [];

    // Filter out empty examples
    const nonEmptyExamples = writingExamples.filter(
      (example) => example.trim() !== "",
    );

    if (nonEmptyExamples.length === 0) {
      // Show error or warning
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/website-projects/${id}/brand-profile/voice/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ writingExamples: nonEmptyExamples }),
        },
      );

      if (res.ok) {
        const analysis = await res.json();
        // Update the form with suggested values
        voiceForm.setValue("brandGlossary", [
          ...new Set([
            ...(voiceForm.getValues().brandGlossary || []),
            ...(analysis.suggestedGlossary || []),
          ]),
        ]);
        if (!voiceForm.getValues().typicalStructure) {
          voiceForm.setValue(
            "typicalStructure",
            analysis.suggestedStructure || "",
          );
        }
        // Show success message or tooltip
        // In a real implementation, we might show a modal or toast
        console.log("Writing examples analyzed:", analysis);
      }
    } catch (err) {
      console.error("Failed to analyze writing examples:", err);
    }
  };

  const onRescan = async () => {
    if (!token || !id || isRescanning) return;
    setIsRescanning(true);
    setProject((prev) => (prev ? { ...prev, scrapeStatus: "pending" } : prev));
    try {
      await fetch(`${API_BASE}/api/website-projects/${id}/scrape-brand`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setIsRescanning(false);
    }
  };

  const onTestHealth = async () => {
    if (!token || !id) return;
    setIsTestingHealth(true);
    setCmsError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/website-projects/${id}/cms-integrations/test`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        setHealthStatus(
          (await res.json()) as Record<string, { ok: boolean; error?: string }>,
        );
      }
    } catch {
      setCmsError("Failed to test connections");
    } finally {
      setIsTestingHealth(false);
    }
  };

  const onConnectOAuth = (path: string) => {
    if (!id) return;
    window.location.href = `${API_BASE}/api/auth/${path}?projectId=${id}`;
  };

  const onSelectMetaPage = async (pageId: string) => {
    if (!token || !metaPageToken) return;
    setIsSelectingMetaPage(true);
    setCmsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/meta/select-page`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ token: metaPageToken, pageId }),
      });
      if (!res.ok) throw new Error("Failed to select page");
      setMetaPageToken(null);
      setMetaPages([]);
      await loadCmsIntegrations();
      setCmsSaveSuccess("Facebook & Instagram connected successfully");
      setTimeout(() => setCmsSaveSuccess(null), 3000);
    } catch {
      setCmsError("Failed to connect Facebook Page");
    } finally {
      setIsSelectingMetaPage(false);
    }
  };

  const onDisconnectSocial = async (platform: "linkedin" | "twitter" | "meta") => {
    if (!token || !id) return;
    const setDisconnecting =
      platform === "linkedin" ? setIsDisconnectingLinkedin
      : platform === "twitter" ? setIsDisconnectingTwitter
      : setIsDisconnectingMeta;
    setDisconnecting(true);
    setCmsError(null);
    try {
      await fetch(`${API_BASE}/api/website-projects/${id}/cms-integrations/${platform}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      setCmsIntegrations((prev) => {
        const n = { ...prev };
        delete n[platform];
        return n;
      });
      setHealthStatus((prev) => {
        if (!prev) return prev;
        const n = { ...prev };
        delete n[platform];
        return n;
      });
    } catch {
      setCmsError(`Failed to disconnect ${platform}`);
    } finally {
      setDisconnecting(false);
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
          <p className="text-muted-foreground mb-6">
            This project doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isScraping = project.scrapeStatus === "pending" || isRescanning;
  const wasAutoFilled = project.scrapeStatus === "done";
  const scrapeFailed = project.scrapeStatus === "failed" && !isRescanning;
  const confidence = project.scrapeData?.confidence;

  const brandProfileUpdatedAt = project.brandProfile?.updatedAt
    ? new Date(project.brandProfile.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <AppLayout>
      <SEO
        title={`${project.name} | goals.ac`}
        description={`SEO project for ${project.url}`}
      />
      <div className="container mx-auto px-4 md:px-8 max-w-5xl py-12">
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-1">
            <Link
              to="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              ← Dashboard
            </Link>
          </div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {project.name}
              </h1>
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
          <p className="text-xs text-muted-foreground mt-2">
            Generate blog posts, guides, whitepapers, and more from your brand profile.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (!id || !isProjectTab(value)) return;
            navigate(`/projects/${id}/${value}`);
          }}
        >
          <TabsList className="mb-8">
            <TabsTrigger value="brand" asChild>
              <Link to={`/projects/${id}/brand`}>Brand Profile</Link>
            </TabsTrigger>
            <TabsTrigger value="voice" asChild>
              <Link to={`/projects/${id}/voice`}>Brand Voice</Link>
            </TabsTrigger>
            <TabsTrigger value="content" asChild>
              <Link to={`/projects/${id}/content`}>
                Your Content
                {content &&
                  content.contentStrategies.length +
                    content.seoArticles.length +
                    content.geoAudits.length +
                    (content.roadmaps?.length ?? 0) >
                    0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                    >
                      {content.contentStrategies.length +
                        content.seoArticles.length +
                        content.geoAudits.length +
                        (content.roadmaps?.length ?? 0)}
                    </Badge>
                  )}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="publishing" asChild>
              <Link to={`/projects/${id}/publishing`}>
                Publishing
                {hasAnyPublishingConnection(cmsIntegrations) && (
                  <Badge
                    variant="secondary"
                    className="ml-2 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    {countPublishingConnections(cmsIntegrations)}
                  </Badge>
                )}
              </Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brand" className="space-y-6">
            <Card className="border-white/7 glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Brand Profile</CardTitle>
                    <CardDescription>
                      This information is used to personalize all AI-generated
                      content for your website.
                    </CardDescription>
                    {brandProfileUpdatedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last updated {brandProfileUpdatedAt}
                      </p>
                    )}
                  </div>
                  {!isScraping && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRescan}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-scan website
                    </Button>
                  )}
                </div>

                {isScraping && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-400/20 bg-blue-500/7 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-500 dark:text-blue-400">
                        Analyzing your website…
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reading your homepage and key pages to pre-fill your
                        brand profile. This takes about 15–30 seconds.
                      </p>
                    </div>
                  </div>
                )}

                {wasAutoFilled && !isScraping && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/7 px-4 py-3">
                    <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Auto-filled from your website — review and save to
                      confirm.
                    </p>
                  </div>
                )}

                {scrapeFailed && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/7 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-500 dark:text-red-400">
                        Website scan failed
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        We couldn't read your website. Fill in the fields
                        manually, or try re-scanning.
                      </p>
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
                    <form
                      onSubmit={form.handleSubmit(onSaveBrandProfile)}
                      className="space-y-6"
                    >
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-2">
                                <FormLabel>Company name</FormLabel>
                                {wasAutoFilled && (
                                  <ConfidenceBadge
                                    level={confidence?.companyName}
                                  />
                                )}
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
                                {wasAutoFilled && (
                                  <ConfidenceBadge
                                    level={confidence?.industry}
                                  />
                                )}
                              </div>
                              <FormControl>
                                <Input
                                  placeholder="B2B SaaS, E-commerce, etc."
                                  {...field}
                                />
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
                              {wasAutoFilled && (
                                <ConfidenceBadge
                                  level={confidence?.targetAudience}
                                />
                              )}
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
                              {wasAutoFilled && (
                                <ConfidenceBadge
                                  level={confidence?.voiceTone}
                                />
                              )}
                            </div>
                            <FormControl>
                              <Input
                                placeholder="Professional yet approachable, data-driven, conversational..."
                                {...field}
                              />
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
                              {wasAutoFilled && (
                                <ConfidenceBadge
                                  level={confidence?.primaryKeywords}
                                />
                              )}
                            </div>
                            <FormControl>
                              <Input
                                placeholder="keyword one, keyword two, keyword three"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              Comma-separated list of your main target keywords
                            </p>
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
                              {wasAutoFilled && (
                                <ConfidenceBadge
                                  level={confidence?.competitorUrls}
                                />
                              )}
                            </div>
                            <FormControl>
                              <Textarea
                                placeholder={
                                  "https://competitor1.com\nhttps://competitor2.com"
                                }
                                className="resize-none font-mono text-sm"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              One URL per line
                            </p>
                          </FormItem>
                        )}
                      />
                      <div className="flex items-center gap-3">
                        <Button
                          type="submit"
                          disabled={isSaving}
                          className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save brand profile
                            </>
                          )}
                        </Button>
                        {saveSuccess && (
                          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            Saved successfully
                          </span>
                        )}
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/7 glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Palette className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Content Style</CardTitle>
                    <CardDescription>
                      Fine-tune the writing persona, tone, and format
                      preferences for all AI-generated content in this project.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...styleForm}>
                  <form
                    onSubmit={styleForm.handleSubmit(onSaveContentStyle)}
                    className="space-y-6"
                  >
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
                                onClick={() =>
                                  field.onChange(
                                    field.value === preset.value
                                      ? undefined
                                      : preset.value,
                                  )
                                }
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
                          <p className="text-xs text-muted-foreground">
                            Give the AI writer a name and role to adopt when
                            generating content
                          </p>
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
                            <span className="text-sm font-semibold text-foreground">
                              {field.value?.toLocaleString() ?? 800} words
                            </span>
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
                            <Select
                              value={field.value ?? "English"}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {LANGUAGES.map((lang) => (
                                  <SelectItem key={lang} value={lang}>
                                    {lang}
                                  </SelectItem>
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
                            <Select
                              value={field.value ?? "none"}
                              onValueChange={(v) =>
                                field.onChange(v === "none" ? undefined : v)
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select reading level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">
                                  Not specified
                                </SelectItem>
                                {READING_LEVELS.map((level) => (
                                  <SelectItem
                                    key={level.value}
                                    value={level.value}
                                  >
                                    {level.label}
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
                          <p className="text-xs text-muted-foreground">
                            Comma-separated — the AI will avoid these in all
                            generated content
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center gap-3">
                      <Button
                        type="submit"
                        disabled={isSavingStyle}
                        className="bg-linear-to-r from-blue-500 to-blue-600 border-0 text-white hover:from-blue-600 hover:to-blue-700"
                      >
                        {isSavingStyle ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save content style
                          </>
                        )}
                      </Button>
                      {saveStyleSuccess && (
                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                          Saved successfully
                        </span>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voice">
            <Card className="border-white/7 glass-card-md shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>Brand Voice</CardTitle>
                    <CardDescription>
                      Customize how our AI writes content to match your unique
                      brand voice and style.
                    </CardDescription>
                  </div>
                  {!isScraping && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRescan}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-scan website
                    </Button>
                  )}
                </div>

                {isScraping && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-400/20 bg-blue-500/7 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500 dark:text-blue-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-500 dark:text-blue-400">
                        Analyzing your website…
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reading your homepage and key pages to pre-fill your
                        brand profile. This takes about 15–30 seconds.
                      </p>
                    </div>
                  </div>
                )}

                {wasAutoFilled && !isScraping && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-500/7 px-4 py-3">
                    <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Auto-filled from your website — review and save to
                      confirm.
                    </p>
                  </div>
                )}

                {scrapeFailed && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/7 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-500 dark:text-red-400">
                        Website scan failed
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        We couldn't read your website. Fill in the fields
                        manually, or try re-scanning.
                      </p>
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
                  <>
                    <Form {...voiceForm}>
                      <form
                        onSubmit={voiceForm.handleSubmit(onSaveBrandVoice)}
                        className="space-y-6"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <label className="text-sm font-medium">
                                Writing Examples
                              </label>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Add 3–5 samples of your best writing so the AI
                                can learn your style.
                              </p>
                            </div>
                            {writingExamples.length > 0 && (
                              <Badge variant="secondary" className="shrink-0">
                                {writingExamples.length}/{MAX_WRITING_EXAMPLES}
                              </Badge>
                            )}
                          </div>

                          {writingExamples.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-8 text-center">
                              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                                Paste blog posts, emails, or landing page copy
                                you are proud of.
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={appendWritingExample}
                              >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Add first sample
                              </Button>
                            </div>
                          ) : writingExamples.length === 1 ? (
                            <div className="rounded-lg border border-border/60 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Sample 1
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeWritingExample(0)}
                                  aria-label="Remove sample 1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormField
                                control={voiceForm.control}
                                name="writingExamples.0"
                                render={({ field: inputField }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Textarea
                                        {...inputField}
                                        placeholder="Paste a writing sample here…"
                                        className="min-h-[120px] resize-y"
                                        rows={4}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ) : (
                            <Accordion type="multiple" className="space-y-2">
                              {writingExamples.map((sample, index) => {
                                const preview = sample.trim()
                                  ? sample.trim().slice(0, 72) +
                                    (sample.trim().length > 72 ? "…" : "")
                                  : "Click to paste a writing sample…";

                                return (
                                  <AccordionItem
                                    key={`writing-example-${index}`}
                                    value={`writing-example-${index}`}
                                    className="rounded-lg border border-border/60 px-3 data-[state=open]:bg-muted/20"
                                  >
                                    <div className="flex items-center gap-1">
                                      <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                                        <div className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                                          <span className="text-xs font-medium text-muted-foreground">
                                            Sample {index + 1}
                                          </span>
                                          <span className="text-sm font-normal text-foreground/80 line-clamp-1">
                                            {preview}
                                          </span>
                                        </div>
                                      </AccordionTrigger>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() =>
                                          removeWritingExample(index)
                                        }
                                        aria-label={`Remove sample ${index + 1}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <AccordionContent className="pb-3">
                                      <FormField
                                        control={voiceForm.control}
                                        name={`writingExamples.${index}`}
                                        render={({ field: inputField }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Textarea
                                                {...inputField}
                                                placeholder="Paste a writing sample here…"
                                                className="min-h-[120px] resize-y"
                                                rows={4}
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          )}

                          {writingExamples.length > 0 &&
                            writingExamples.length < MAX_WRITING_EXAMPLES && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full border-dashed"
                                onClick={appendWritingExample}
                              >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Add another sample
                              </Button>
                            )}
                        </div>
                        <Button
                          type="button"
                          onClick={onAnalyzeWritingExamples}
                          className="w-full text-sm font-medium border border-blue-500 hover:border-blue-600"
                        >
                          Analyze Examples
                        </Button>
                        <VoiceStringListField
                          label="Brand Glossary"
                          description="Words and phrases you commonly use in your content."
                          emptyDescription="Add product names, branded terms, or phrases your team uses consistently."
                          placeholder="Enter a term…"
                          addFirstLabel="Add first term"
                          addAnotherLabel="Add another term"
                          maxItems={MAX_VOICE_TERMS}
                          name="brandGlossary"
                          control={voiceForm.control}
                          values={brandGlossary}
                          onAppend={() =>
                            appendVoiceListItem("brandGlossary", brandGlossary)
                          }
                          onRemove={(index) =>
                            removeVoiceListItem(
                              "brandGlossary",
                              brandGlossary,
                              index,
                            )
                          }
                        />
                        <VoiceStringListField
                          label="Anti-patterns"
                          description="Words and phrases you never want to appear in your content."
                          emptyDescription="List clichés, buzzwords, or off-brand language to block."
                          placeholder="Enter a term to avoid…"
                          addFirstLabel="Add first term"
                          addAnotherLabel="Add another term"
                          maxItems={MAX_VOICE_TERMS}
                          name="antiPatterns"
                          control={voiceForm.control}
                          values={antiPatterns}
                          onAppend={() =>
                            appendVoiceListItem("antiPatterns", antiPatterns)
                          }
                          onRemove={(index) =>
                            removeVoiceListItem(
                              "antiPatterns",
                              antiPatterns,
                              index,
                            )
                          }
                        />
                        <div className="space-y-4">
                          <label className="text-sm font-medium mb-1">
                            Typical Structure
                          </label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Describe your typical content structure (e.g., "Hook
                            → Problem → Solution → CTA").
                          </p>
                          <Input
                            placeholder="Hook → Problem → Solution → CTA"
                            value={voiceForm.getValues().typicalStructure}
                            onChange={(e) =>
                              voiceForm.setValue(
                                "typicalStructure",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <VoiceStringListField
                          label="Preferred Words"
                          description="Words you like to use in your content."
                          emptyDescription="Add words that match your brand tone and voice."
                          placeholder="Enter a preferred word…"
                          addFirstLabel="Add first word"
                          addAnotherLabel="Add another word"
                          maxItems={MAX_VOICE_TERMS}
                          name="doWords"
                          control={voiceForm.control}
                          values={doWords}
                          onAppend={() =>
                            appendVoiceListItem("doWords", doWords)
                          }
                          onRemove={(index) =>
                            removeVoiceListItem("doWords", doWords, index)
                          }
                        />
                        <VoiceStringListField
                          label="Words to Avoid"
                          description="Words you don't want to use in your content."
                          emptyDescription="Add words that feel off-brand or you want the AI to skip."
                          placeholder="Enter a word to avoid…"
                          addFirstLabel="Add first word"
                          addAnotherLabel="Add another word"
                          maxItems={MAX_VOICE_TERMS}
                          name="dontWords"
                          control={voiceForm.control}
                          values={dontWords}
                          onAppend={() =>
                            appendVoiceListItem("dontWords", dontWords)
                          }
                          onRemove={(index) =>
                            removeVoiceListItem("dontWords", dontWords, index)
                          }
                        />
                      </form>
                    </Form>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="publishing">
            <div className="space-y-6">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Content Autopilot
                    {autopilotSettings.enabled && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Automatically generate the next due article from your content strategy on a daily or weekly schedule.
                    Connect a CMS below to publish drafts or go live.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {autopilotError && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{autopilotError}</span>
                    </div>
                  )}
                  {autopilotSaveSuccess && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3 border border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Autopilot settings saved</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Enable autopilot</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Picks the next due topic from your content strategy calendar
                      </p>
                    </div>
                    <Switch
                      checked={autopilotSettings.enabled}
                      onCheckedChange={(checked) =>
                        setAutopilotSettings((prev) => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Schedule</Label>
                      <Select
                        value={autopilotSettings.cadence}
                        onValueChange={(value: "daily" | "weekly") =>
                          setAutopilotSettings((prev) => ({ ...prev, cadence: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily (one article per day)</SelectItem>
                          <SelectItem value="weekly">Weekly (one article per week)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Publish mode</Label>
                      <Select
                        value={autopilotSettings.publishMode}
                        onValueChange={(value: AutopilotSettings["publishMode"]) =>
                          setAutopilotSettings((prev) => ({ ...prev, publishMode: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual review (generate only)</SelectItem>
                          <SelectItem value="draft">Auto-publish as draft</SelectItem>
                          <SelectItem value="live">Auto-publish live</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select
                        value={autopilotSettings.timezone}
                        onValueChange={(value) =>
                          setAutopilotSettings((prev) => ({ ...prev, timezone: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Run at (local time)</Label>
                      <Select
                        value={String(autopilotSettings.preferredRunHour)}
                        onValueChange={(value) =>
                          setAutopilotSettings((prev) => ({
                            ...prev,
                            preferredRunHour: Number(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RUN_HOUR_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Auto-queue keyword opportunities</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        High-score keyword gaps added to your content strategy calendar
                      </p>
                    </div>
                    <Switch
                      checked={autopilotSettings.autoQueueOpportunities ?? false}
                      onCheckedChange={(checked) =>
                        setAutopilotSettings((prev) => ({ ...prev, autoQueueOpportunities: checked }))
                      }
                    />
                  </div>
                  {(autopilotSettings.autoQueueOpportunities ?? false) && (
                    <div className="space-y-2">
                      <Label>Minimum opportunity score to auto-queue</Label>
                      <Select
                        value={String(autopilotSettings.opportunityScoreThreshold ?? 60)}
                        onValueChange={(value) =>
                          setAutopilotSettings((prev) => ({
                            ...prev,
                            opportunityScoreThreshold: Number(value),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50 (moderate opportunities)</SelectItem>
                          <SelectItem value="60">60 (recommended)</SelectItem>
                          <SelectItem value="70">70 (high confidence only)</SelectItem>
                          <SelectItem value="80">80 (very selective)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {autopilotSettings.lastRunAt && (
                    <p className="text-xs text-muted-foreground">
                      Last run: {new Date(autopilotSettings.lastRunAt).toLocaleString()}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={onSaveAutopilot} disabled={isSavingAutopilot}>
                      {isSavingAutopilot ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save autopilot settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    AI Visibility & GEO
                  </CardTitle>
                  <CardDescription>
                    Weekly LLM citation tracking and GEO re-audits.{" "}
                    <Link to="/ai-visibility" className="text-blue-600 dark:text-blue-400 hover:underline">
                      view full dashboard
                    </Link>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {visibilitySaveSuccess && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3 border border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Visibility settings saved</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">LLM citation tracking</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Weekly checks across ChatGPT, Perplexity, Claude, Gemini</p>
                    </div>
                    <Switch
                      checked={visibilitySettings.llmTrackingEnabled}
                      onCheckedChange={(checked) =>
                        setVisibilitySettings((prev) => ({ ...prev, llmTrackingEnabled: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Weekly GEO re-audit</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Re-scan homepage for schema and meta issues</p>
                    </div>
                    <Switch
                      checked={visibilitySettings.geoReauditEnabled}
                      onCheckedChange={(checked) =>
                        setVisibilitySettings((prev) => ({ ...prev, geoReauditEnabled: checked }))
                      }
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={onSaveVisibility} disabled={isSavingVisibility} variant="outline">
                      {isSavingVisibility ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save visibility settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <PublishingSettingsPanel
                apiBase={API_BASE}
                projectId={id!}
                token={token!}
                cmsIntegrations={cmsIntegrations}
                healthStatus={healthStatus}
                cmsError={cmsError}
                cmsSaveSuccess={cmsSaveSuccess}
                isTestingHealth={isTestingHealth}
                metaPageToken={metaPageToken}
                metaPages={metaPages}
                isSelectingMetaPage={isSelectingMetaPage}
                isDisconnectingLinkedin={isDisconnectingLinkedin}
                isDisconnectingTwitter={isDisconnectingTwitter}
                isDisconnectingMeta={isDisconnectingMeta}
                onIntegrationsChange={setCmsIntegrations}
                onHealthKeyRemove={(key) =>
                  setHealthStatus((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  })
                }
                onError={setCmsError}
                onSaveSuccess={(message) => {
                  setCmsSaveSuccess(message);
                  setTimeout(() => setCmsSaveSuccess(null), 3000);
                }}
                onTestHealth={onTestHealth}
                onConnectOAuth={onConnectOAuth}
                onDisconnectSocial={onDisconnectSocial}
                onSelectMetaPage={onSelectMetaPage}
              />
            </div>
          </TabsContent>

          <TabsContent value="content">
            <div className="space-y-6">
              {content && content.seoArticles.length > 0 && (
                <Card className="border-white/7 glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      SEO Articles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {content.seoArticles.map((article) => (
                        <div
                          key={article.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {article.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {article.primaryKeyword} · {article.wordCount}{" "}
                              words
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="hover:bg-muted dark:hover:bg-white/7"
                          >
                            <Link to={`/seo-article/${article.id}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content && content.contentStrategies.length > 0 && (
                <Card className="border-white/7 glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      Content Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {content.contentStrategies.map((strategy) => (
                        <div
                          key={strategy.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm">
                              {strategy.industry} · {strategy.location}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {strategy.stage}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="hover:bg-muted dark:hover:bg-white/7"
                          >
                            <Link to={`/content-strategy/${strategy.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content && content.geoAudits.length > 0 && (
                <Card className="border-white/7 glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Search className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      GEO Audits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {content.geoAudits.map((audit) => (
                        <div
                          key={audit.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {audit.url.replace(/^https?:\/\//, "")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              GEO Score:{" "}
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                {audit.geoScore}/100
                              </span>
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="hover:bg-muted dark:hover:bg-white/7"
                          >
                            <Link to={`/geo-audit/${audit.id}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content && content.roadmaps && content.roadmaps.length > 0 && (
                <Card className="border-white/7 glass-card-md shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Growth Roadmaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {content.roadmaps.map((roadmap) => (
                        <div
                          key={roadmap.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm">
                              {roadmap.industry} · {roadmap.location}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                              {roadmap.stage} stage
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="hover:bg-muted dark:hover:bg-white/7"
                          >
                            <Link to={`/roadmap/${roadmap.slug}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content &&
                content.contentStrategies.length === 0 &&
                content.seoArticles.length === 0 &&
                content.geoAudits.length === 0 &&
                (!content.roadmaps || content.roadmaps.length === 0) && (
                  <Card className="border-white/7 glass-card border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-full glass-card-md flex items-center justify-center mb-4">
                        <FileText className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                      </div>
                      <CardTitle className="text-lg mb-2">
                        No content yet
                      </CardTitle>
                      <CardDescription className="max-w-sm mb-6">
                        Use the tools on the home page to generate roadmaps,
                        content strategies, SEO articles, and GEO audits.
                        They'll appear here when you're logged in.
                      </CardDescription>
                      <Button
                        className="glow-primary bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 border-0 text-white"
                        asChild
                      >
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
