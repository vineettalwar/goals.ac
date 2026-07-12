import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/auth";
import {
  ArrowLeft, Copy, Check, Loader2, AlertCircle, Edit3, Eye,
  RefreshCw, Save, BookOpen, Newspaper, GraduationCap, Map,
  FileSearch, LayoutTemplate, Globe, ImageIcon, Trash2, Send, ExternalLink,
  Linkedin, Twitter, Instagram, Mail, Megaphone, MonitorPlay, Package, Radio, HelpCircle,
  Shuffle, CheckCircle2, Circle, FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ContentFormatType =
  | "blog_post"
  | "news_article"
  | "tutorial"
  | "guide"
  | "whitepaper"
  | "pillar_page"
  | "location_page"
  | "infographic_outline"
  | "linkedin_post"
  | "twitter_thread"
  | "instagram_post"
  | "facebook_post"
  | "email_sequence"
  | "ad_copy"
  | "landing_page_copy"
  | "product_description"
  | "press_release"
  | "faq_article";

interface ContentPiece {
  id: number;
  websiteProjectId: number;
  formatType: ContentFormatType;
  title: string;
  targetKeyword: string;
  bodyMarkdown: string;
  status: string;
  wordCount: number;
  plannedDate: string | null;
  publishedUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const FORMAT_META: Record<ContentFormatType, { label: string; icon: React.ElementType; color: string }> = {
  blog_post: { label: "Blog Post", icon: BookOpen, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  news_article: { label: "News Article", icon: Newspaper, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  tutorial: { label: "Tutorial", icon: GraduationCap, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  guide: { label: "Comprehensive Guide", icon: Map, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  whitepaper: { label: "Whitepaper", icon: FileSearch, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  pillar_page: { label: "Pillar Page", icon: LayoutTemplate, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  location_page: { label: "Location Page", icon: Globe, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  infographic_outline: { label: "Infographic Outline", icon: ImageIcon, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  linkedin_post: { label: "LinkedIn Post", icon: Linkedin, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  twitter_thread: { label: "Twitter / X Thread", icon: Twitter, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  instagram_post: { label: "Instagram Post", icon: Instagram, color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400" },
  facebook_post: { label: "Facebook Post", icon: Globe, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  email_sequence: { label: "Email Sequence", icon: Mail, color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  ad_copy: { label: "Ad Copy", icon: Megaphone, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  landing_page_copy: { label: "Landing Page Copy", icon: MonitorPlay, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  product_description: { label: "Product Description", icon: Package, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  press_release: { label: "Press Release", icon: Radio, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  faq_article: { label: "FAQ / Knowledge Base", icon: HelpCircle, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
};

const ALL_FORMATS = Object.keys(FORMAT_META) as ContentFormatType[];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  published: "Published",
};

type PublishPlatform = "wordpress" | "notion" | "webflow" | "linkedin" | "twitter" | "instagram" | "facebook";

type CmsConnectionStatus = {
  notion?: { databaseId: string; integrationTokenHint: string };
  webflow?: { collectionId: string; apiTokenHint: string; bodyFieldSlug: string };
  wordpress?: { siteUrl: string; usernameHint: string };
  linkedin?: { connected: boolean; displayName?: string };
  twitter?: { connected: boolean; screenName?: string };
  meta?: { connected: boolean; pageName?: string; instagramUsername?: string };
};

const SOCIAL_FORMAT_PLATFORMS: Partial<Record<ContentFormatType, PublishPlatform[]>> = {
  linkedin_post: ["linkedin"],
  twitter_thread: ["twitter"],
  instagram_post: ["instagram"],
  facebook_post: ["facebook"],
};

const CMS_FORMAT_PLATFORMS: PublishPlatform[] = ["wordpress", "notion", "webflow"];

function PublishDialog({
  open,
  onClose,
  onPublished,
  pieceId,
  projectId,
  token,
  formatType,
}: {
  open: boolean;
  onClose: () => void;
  onPublished: (updated: ContentPiece) => void;
  pieceId: number;
  projectId: number;
  token: string | null;
  formatType: ContentFormatType;
}) {
  const [platform, setPlatform] = useState<PublishPlatform>("wordpress");
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<CmsConnectionStatus | null>(null);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setIsLoadingConnections(true);
    fetch(`${API_BASE}/api/website-projects/${projectId}/cms-integrations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: CmsConnectionStatus) => {
        setConnections(data);
        const social = SOCIAL_FORMAT_PLATFORMS[formatType] ?? [];
        const cms = CMS_FORMAT_PLATFORMS.filter((p) => {
          if (p === "wordpress") return !!data.wordpress;
          if (p === "notion") return !!data.notion;
          if (p === "webflow") return !!data.webflow;
          return false;
        });
        const socialConnected = social.filter((p) => {
          if (p === "linkedin") return !!data.linkedin;
          if (p === "twitter") return !!data.twitter;
          if (p === "instagram") return !!data.meta?.instagramUsername || !!data.meta;
          if (p === "facebook") return !!data.meta;
          return false;
        });
        const first = [...socialConnected, ...cms][0];
        if (first) setPlatform(first);
      })
      .catch(() => setConnections({}))
      .finally(() => setIsLoadingConnections(false));
  }, [open, token, projectId, formatType]);

  const reset = () => {
    setError(null);
    setIsPublishing(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      let endpoint = "";

      if (platform === "wordpress") {
        endpoint = `${API_BASE}/api/content-pieces/${pieceId}/publish/wordpress`;
      } else if (platform === "notion") {
        endpoint = `${API_BASE}/api/content-pieces/${pieceId}/publish/notion`;
      } else if (platform === "webflow") {
        endpoint = `${API_BASE}/api/content-pieces/${pieceId}/publish/webflow`;
      } else if (platform === "linkedin") {
        endpoint = `${API_BASE}/api/content-pieces/${pieceId}/publish/linkedin`;
      } else if (platform === "twitter") {
        endpoint = `${API_BASE}/api/content-pieces/${pieceId}/publish/twitter`;
      } else if (platform === "instagram") {
        endpoint = `${API_BASE}/api/content-pieces/${pieceId}/publish/instagram`;
      } else if (platform === "facebook") {
        endpoint = `${API_BASE}/api/content-pieces/${pieceId}/publish/facebook`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Publish failed");
      }
      const updated = await res.json() as ContentPiece;
      onPublished(updated);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const platformLabels: Record<PublishPlatform, string> = {
    wordpress: "WordPress",
    notion: "Notion",
    webflow: "Webflow",
    linkedin: "LinkedIn",
    twitter: "X",
    instagram: "Instagram",
    facebook: "Facebook",
  };

  const formatPlatforms = SOCIAL_FORMAT_PLATFORMS[formatType] ?? CMS_FORMAT_PLATFORMS;

  const availablePlatforms: PublishPlatform[] = formatPlatforms.filter((p) => {
    if (p === "wordpress") return !!connections?.wordpress;
    if (p === "notion") return !!connections?.notion;
    if (p === "webflow") return !!connections?.webflow;
    if (p === "linkedin") return !!connections?.linkedin;
    if (p === "twitter") return !!connections?.twitter;
    if (p === "instagram") return !!connections?.meta;
    if (p === "facebook") return !!connections?.meta;
    return false;
  });

  const hasConnections = availablePlatforms.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Publish Content
          </DialogTitle>
          <DialogDescription>
            Choose a platform to publish this content piece to.
          </DialogDescription>
        </DialogHeader>

        {isLoadingConnections ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !hasConnections ? (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-sm text-center space-y-2">
            <p className="font-medium text-foreground">No publishing destinations connected</p>
            <p className="text-muted-foreground">
              Connect publishing destinations in{" "}
              <strong>Project Settings → Publishing</strong> before publishing content.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <div className={`grid gap-2 ${availablePlatforms.length === 1 ? "grid-cols-1" : availablePlatforms.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {availablePlatforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPlatform(p); setError(null); }}
                    disabled={isPublishing}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                      platform === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {platformLabels[p]}
                  </button>
                ))}
              </div>
            </div>

            {platform === "wordpress" && connections?.wordpress && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-foreground">Connected WordPress site</p>
                <p className="text-muted-foreground">Site URL: <code className="text-xs bg-muted px-1 rounded">{connections.wordpress.siteUrl}</code></p>
                <p className="text-muted-foreground text-xs mt-1">The content will be published as a new post on this site.</p>
              </div>
            )}

            {platform === "notion" && connections?.notion && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-foreground">Connected Notion database</p>
                <p className="text-muted-foreground">Database ID: <code className="text-xs bg-muted px-1 rounded">{connections.notion.databaseId}</code></p>
                <p className="text-muted-foreground text-xs mt-1">The content will be published as a new page in this database.</p>
              </div>
            )}

            {platform === "webflow" && connections?.webflow && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-foreground">Connected Webflow collection</p>
                <p className="text-muted-foreground">Collection ID: <code className="text-xs bg-muted px-1 rounded">{connections.webflow.collectionId}</code></p>
                <p className="text-muted-foreground text-xs mt-1">A draft CMS item will be created. You can review and publish it in Webflow.</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={handlePublish}
                disabled={!hasConnections || isPublishing}
                className="flex-1"
              >
                {isPublishing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Publish to {platformLabels[platform]}</>
                )}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type RepurposeStep = "analyzing" | "generating" | "saving";

const REPURPOSE_STEPS: { key: RepurposeStep; label: string }[] = [
  { key: "analyzing", label: "Analyzing source content" },
  { key: "generating", label: "Generating repurposed content" },
  { key: "saving", label: "Saving new piece" },
];

function RepurposeDialog({
  open,
  onClose,
  piece,
  token,
}: {
  open: boolean;
  onClose: () => void;
  piece: ContentPiece;
  token: string | null;
}) {
  const navigate = useNavigate();
  const [targetFormat, setTargetFormat] = useState<ContentFormatType | "">("");
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<RepurposeStep>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = () => {
    setTargetFormat("");
    setError(null);
    setIsRepurposing(false);
    setCompletedSteps(new Set());
  };

  const handleClose = () => {
    abortRef.current?.abort();
    reset();
    onClose();
  };

  const handleRepurpose = async () => {
    if (!targetFormat) return;
    setIsRepurposing(true);
    setCompletedSteps(new Set());
    setError(null);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${piece.id}/repurpose/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetFormat }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Repurpose failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace("event:", "").trim();
          const payload = JSON.parse(dataLine.replace("data:", "").trim()) as Record<string, unknown>;

          if (eventType === "step") {
            const step = payload.step as RepurposeStep;
            setCompletedSteps((prev) => new Set([...prev, step]));
          } else if (eventType === "done") {
            const newPiece = payload as unknown as ContentPiece;
            handleClose();
            navigate(`/content-piece/${newPiece.id}`);
            return;
          } else if (eventType === "error") {
            throw new Error((payload.error as string) ?? "Repurpose failed");
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Failed to repurpose content");
        setIsRepurposing(false);
      }
    }
  };

  const otherFormats = ALL_FORMATS.filter((f) => f !== piece.formatType);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" />
            Repurpose Content
          </DialogTitle>
          <DialogDescription>
            Convert this {FORMAT_META[piece.formatType].label} into a different format. A new content piece will be created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Target format</Label>
            <Select value={targetFormat} onValueChange={(v) => setTargetFormat(v as ContentFormatType)} disabled={isRepurposing}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a format…" />
              </SelectTrigger>
              <SelectContent>
                {otherFormats.map((f) => {
                  const meta = FORMAT_META[f];
                  const Icon = meta.icon;
                  return (
                    <SelectItem key={f} value={f}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The AI will adapt this content's key insights and messaging into the chosen format.
            </p>
          </div>

          {isRepurposing && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wide mb-2">
                Repurposing…
              </p>
              {REPURPOSE_STEPS.map(({ key, label }) => {
                const done = completedSteps.has(key);
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 animate-pulse" />
                    )}
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleRepurpose}
              disabled={!targetFormat || isRepurposing}
              className="flex-1"
            >
              {isRepurposing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Repurposing…</>
              ) : (
                <><Shuffle className="w-4 h-4 mr-2" />Repurpose</>
              )}
            </Button>
            <Button variant="outline" onClick={handleClose} disabled={isRepurposing}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ContentPiecePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [piece, setPiece] = useState<ContentPiece | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [repurposeOpen, setRepurposeOpen] = useState(false);

  const [isMarkingReady, setIsMarkingReady] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPlannedDate, setEditPlannedDate] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError("Content piece not found"); return; }
      const data = await res.json() as ContentPiece;
      setPiece(data);
      setEditTitle(data.title);
      setEditBody(data.bodyMarkdown);
      setEditStatus(data.status);
      setEditPlannedDate(data.plannedDate ?? "");
    } catch {
      setError("Failed to load content");
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!token || !id || !piece) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editTitle,
          bodyMarkdown: editBody,
          ...(editStatus !== "published" ? { status: editStatus } : {}),
          plannedDate: editPlannedDate || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json() as ContentPiece;
        setPiece(updated);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        alert(`Failed to save: ${body.error ?? "Please try again."}`);
      }
    } catch {
      alert("Failed to save changes. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!token || !id || !piece) return;
    if (!confirm("Regenerate this content? The current version will be replaced.")) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${id}/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = await res.json() as ContentPiece;
        setPiece(updated);
        setEditTitle(updated.title);
        setEditBody(updated.bodyMarkdown);
        setIsEditing(false);
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        alert(`Failed to regenerate: ${body.error ?? "Please try again."}`);
      }
    } catch {
      alert("Failed to regenerate content. Please check your connection.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !id || !piece) return;
    if (!confirm("Permanently delete this content piece?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        navigate(`/projects/${piece.websiteProjectId}/content-studio`);
      } else {
        alert("Failed to delete content piece. Please try again.");
      }
    } catch {
      alert("Failed to delete content piece. Please check your connection.");
    }
  };

  const handleMarkReady = async () => {
    if (!token || !id || !piece) return;
    setIsMarkingReady(true);
    try {
      const res = await fetch(`${API_BASE}/api/content-pieces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "ready" }),
      });
      if (res.ok) {
        const updated = await res.json() as ContentPiece;
        setPiece(updated);
        setEditStatus("ready");
      }
    } catch {
    } finally {
      setIsMarkingReady(false);
    }
  };

  const handleCopy = async () => {
    if (!piece) return;
    await navigator.clipboard.writeText(piece.bodyMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
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

  if (error || !piece) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Content not found</h2>
          <p className="text-muted-foreground mb-6">{error ?? "This content piece does not exist."}</p>
          <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const meta = FORMAT_META[piece.formatType] ?? { label: piece.formatType, icon: BookOpen, color: "bg-muted text-muted-foreground" };
  const Icon = meta.icon;
  const statusColor = STATUS_COLORS[piece.status] ?? "bg-muted text-muted-foreground";
  const statusLabel = STATUS_LABELS[piece.status] ?? piece.status;

  return (
    <AppLayout>
      <SEO title={`${piece.title} | Content Studio | goals.ac`} description={`${meta.label} — ${piece.targetKeyword}`} />
      <div className="container mx-auto px-4 md:px-8 max-w-4xl py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <span>›</span>
          <Link to={`/projects/${piece.websiteProjectId}/content-studio`} className="hover:text-foreground transition-colors">Content Studio</Link>
          <span>›</span>
          <span className="text-foreground truncate max-w-[200px]">{piece.title}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className={`p-2 rounded-lg ${meta.color}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{meta.label}</span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{piece.wordCount.toLocaleString()} words</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{format(parseISO(piece.createdAt), "d MMM yyyy")}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusColor}`}>
                  {statusLabel}
                </span>
                {piece.publishedUrl && (
                  <a
                    href={piece.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View live post
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {saveSuccess && <span className="text-sm text-green-600 font-medium">Saved</span>}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <><Check className="w-4 h-4 mr-1.5 text-green-600" />Copied</> : <><Copy className="w-4 h-4 mr-1.5" />Copy</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRepurposeOpen(true)} title="Convert to another format">
              <Shuffle className="w-4 h-4 mr-1.5" />Repurpose
            </Button>
            {piece.status !== "published" && (
              <Button size="sm" onClick={() => setPublishOpen(true)}>
                <Send className="w-4 h-4 mr-1.5" />Publish
              </Button>
            )}
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Edit3 className="w-4 h-4 mr-1.5" />Edit
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <Eye className="w-4 h-4 mr-1.5" />Preview
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              title="Regenerate with AI"
            >
              {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {piece.status === "draft" && !isEditing && (
          <div className="flex items-center justify-between gap-4 mb-6 px-4 py-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Draft — review the content below, then mark it ready when it's good to publish.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkReady}
              disabled={isMarkingReady}
              className="flex-shrink-0"
            >
              {isMarkingReady ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Mark as ready</>}
            </Button>
          </div>
        )}

        {piece.publishedUrl && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Published</p>
              <a
                href={piece.publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
              >
                {piece.publishedUrl}
              </a>
            </div>
            <a href={piece.publishedUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 hover:bg-blue-50">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />View
              </Button>
            </a>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Planned date (optional)</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editPlannedDate}
                  onChange={(e) => setEditPlannedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-body">Content (Markdown)</Label>
              <Textarea
                ref={textareaRef}
                id="edit-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="font-mono text-sm resize-y"
                rows={30}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save changes</>}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">{piece.title}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-8 pb-5 border-b border-border/50 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Circle className="w-2 h-2 fill-primary text-primary" />
                {piece.targetKeyword}
              </span>
              {piece.wordCount > 0 && (
                <span>{piece.wordCount.toLocaleString()} words</span>
              )}
              {piece.plannedDate && (
                <span>Planned {format(parseISO(piece.plannedDate), "d MMM yyyy")}</span>
              )}
            </div>

            <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-base prose-li:leading-relaxed">
              <ReactMarkdown>{piece.bodyMarkdown}</ReactMarkdown>
            </article>

            <div className="mt-12 border-t border-border/40 pt-8 flex items-center justify-between flex-wrap gap-4">
              <Link to={`/projects/${piece.websiteProjectId}/content-studio`}>
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Content Studio
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setRepurposeOpen(true)}>
                  <Shuffle className="w-4 h-4 mr-2" />Repurpose
                </Button>
                <Button variant="outline" onClick={startEdit}>
                  <Edit3 className="w-4 h-4 mr-2" />Edit
                </Button>
                {piece.status !== "published" && (
                  <Button variant="outline" onClick={() => setPublishOpen(true)}>
                    <Send className="w-4 h-4 mr-2" />Publish
                  </Button>
                )}
                <Button onClick={handleCopy}>
                  {copied ? <><Check className="w-4 h-4 mr-2" />Copied</> : <><Copy className="w-4 h-4 mr-2" />Copy Markdown</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={(updated) => setPiece(updated)}
        pieceId={piece.id}
        projectId={piece.websiteProjectId}
        token={token}
        formatType={piece.formatType}
      />

      <RepurposeDialog
        open={repurposeOpen}
        onClose={() => setRepurposeOpen(false)}
        piece={piece}
        token={token}
      />
    </AppLayout>
  );
}
