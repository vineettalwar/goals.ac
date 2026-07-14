import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/use-auth";
import { safeJson } from "@/lib/safe-json";
import { type PublishingPendingAction } from "@/components/publishing-settings-pending";
import { type CmsIntegrationStatus } from "@/components/publishing-settings-panel";
import { hasAnyPublishingConnection } from "@/lib/publishing-destinations";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_AUTOPILOT, DEFAULT_VISIBILITY, API_BASE } from "./project-detail-constants";

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

const PROJECT_TABS = ["brand", "voice", "content", "publishing"] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];
export { PROJECT_TABS };

export function isProjectTab(value: string | undefined): value is ProjectTab {
  return value != null && (PROJECT_TABS as readonly string[]).includes(value);
}

type VoiceStringListName =
  | "brandGlossary"
  | "antiPatterns"
  | "doWords"
  | "dontWords";

export function useProjectDetail() {

  const { id, tab: tabParam } = useParams<{ id: string; tab?: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
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
  const [pendingAction, setPendingAction] = useState<PublishingPendingAction>(null);
  const [metaPageToken, setMetaPageToken] = useState<string | null>(null);
  const [metaPages, setMetaPages] = useState<Array<{
    pageId: string;
    pageName: string;
    instagramAccountId?: string;
    instagramUsername?: string;
  }>>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cmsError, setCmsError] = useState<string | null>(null);
  const [cmsSaveSuccess, setCmsSaveSuccess] = useState<string | null>(null);
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
    if (!hasAnyPublishingConnection(cmsIntegrations) || pendingAction === "testing_health") return;
    setPendingAction("testing_health");
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
      .finally(() => setPendingAction(null));
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
      toast({
        title: "Add writing examples first",
        description: "Enter at least one sample before analyzing voice.",
        variant: "destructive",
      });
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
        toast({
          title: "Voice analysis complete",
          description: "Suggested glossary and structure were applied to the form.",
        });
      }
    } catch (err) {
      toast({
        title: "Voice analysis failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
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
    setPendingAction("testing_health");
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
      setPendingAction(null);
    }
  };

  const onConnectOAuth = (path: string) => {
    if (!id) return;
    window.location.href = `${API_BASE}/api/auth/${path}?projectId=${id}`;
  };

  const onSelectMetaPage = async (pageId: string) => {
    if (!token || !metaPageToken) return;
    setPendingAction("selecting_meta_page");
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
      setPendingAction(null);
    }
  };

  const onDisconnectSocial = async (platform: "linkedin" | "twitter" | "meta") => {
    if (!token || !id) return;
    const action: PublishingPendingAction = platform === "linkedin" ? "disconnecting_linkedin" : platform === "twitter" ? "disconnecting_twitter" : "disconnecting_meta";
    setPendingAction(action);
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
      setPendingAction(null);
    }
  };


  const ctx = {
    form, styleForm, voiceForm, project, content, id, token, activeTab, navigate,
    cmsIntegrations, healthStatus, cmsError, cmsSaveSuccess, pendingAction, metaPageToken, metaPages,
    autopilotSettings, visibilitySettings, isSaving, saveSuccess, isSavingStyle, saveStyleSuccess,
    isRescanning, isSavingAutopilot, autopilotSaveSuccess, autopilotError, isSavingVisibility,
    visibilitySaveSuccess, writingExamples, brandGlossary, antiPatterns, doWords, dontWords,
    MAX_WRITING_EXAMPLES, MAX_VOICE_TERMS, onSaveBrandProfile, onSaveContentStyle, onSaveBrandVoice,
    onRescan, onSaveAutopilot, onSaveVisibility, onAnalyzeWritingExamples, appendWritingExample,
    removeWritingExample, appendVoiceListItem, removeVoiceListItem, setAutopilotSettings,
    setVisibilitySettings, setCmsIntegrations, setHealthStatus, setCmsError, setCmsSaveSuccess,
    onTestHealth, onConnectOAuth, onDisconnectSocial, onSelectMetaPage,
    isScraping: project?.scrapeStatus === "pending" || isRescanning,
    wasAutoFilled: project?.scrapeStatus === "done",
    scrapeFailed: project?.scrapeStatus === "failed" && !isRescanning,
    brandProfileUpdatedAt: project?.brandProfile?.updatedAt
      ? new Date(project.brandProfile.updatedAt).toLocaleDateString(undefined, {
          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
        })
      : null,
  };

  return { isLoading, error, project, ctx };
}

export type ProjectDetailCtx = ReturnType<typeof useProjectDetail>["ctx"];
