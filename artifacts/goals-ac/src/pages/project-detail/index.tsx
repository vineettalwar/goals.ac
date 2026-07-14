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
import { useAuth } from "@/context/use-auth";
import { safeJson } from "@/lib/safe-json";
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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  PublishingSettingsPanel,
  type CmsIntegrationStatus,
} from "@/components/publishing-settings-panel";
import { type PublishingPendingAction } from "@/components/publishing-settings-pending";
import { VoiceStringListField } from "./project-detail-voice-string-list-field";
import { ProjectDetailBrandTab } from "./project-detail-brand-tab";
import { ProjectDetailVoiceTab } from "./project-detail-voice-tab";
import { ProjectDetailPublishingTab } from "./project-detail-publishing-tab";
import { ProjectDetailContentTab } from "./project-detail-content-tab";
import { useProjectDetail, isProjectTab } from "./use-project-detail";
import {
  countPublishingConnections,
  hasAnyPublishingConnection,
} from "@/lib/publishing-destinations";
import { useToast } from "@/hooks/use-toast";

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

export default function ProjectDetail() {
  const { isLoading, error, project, ctx } = useProjectDetail();
  const { id, content, cmsIntegrations, activeTab, navigate } = ctx;
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

          <ProjectDetailBrandTab ctx={ctx} />

          <ProjectDetailVoiceTab ctx={ctx} />

          <ProjectDetailPublishingTab ctx={ctx} />

          <ProjectDetailContentTab ctx={ctx} />
        </Tabs>
      </div>
    </AppLayout>
  );
}
