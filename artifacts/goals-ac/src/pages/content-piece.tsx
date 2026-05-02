import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth";
import {
  ArrowLeft, Copy, Check, Loader2, AlertCircle, Edit3, Eye,
  RefreshCw, Save, BookOpen, Newspaper, GraduationCap, Map,
  FileSearch, LayoutTemplate, Globe, ImageIcon, Trash2
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
  | "infographic_outline";

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
};

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
          status: editStatus,
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
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !piece) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Content not found</h2>
          <p className="text-muted-foreground mb-6">{error ?? "This content piece does not exist."}</p>
          <Button asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
        </div>
      </Layout>
    );
  }

  const meta = FORMAT_META[piece.formatType];
  const Icon = meta.icon;

  return (
    <Layout>
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
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{piece.wordCount.toLocaleString()} words</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">{format(parseISO(piece.createdAt), "d MMM yyyy")}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full capitalize ${piece.status === "ready" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                  {piece.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {saveSuccess && <span className="text-sm text-green-600 font-medium">Saved</span>}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <><Check className="w-4 h-4 mr-1.5 text-green-600" />Copied</> : <><Copy className="w-4 h-4 mr-1.5" />Copy</>}
            </Button>
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

            <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Keyword:</span>
              <span className="inline-flex items-center text-sm font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                {piece.targetKeyword}
              </span>
              {piece.plannedDate && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">Planned: {format(parseISO(piece.plannedDate), "d MMM yyyy")}</span>
                </>
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
                <Button variant="outline" onClick={startEdit}>
                  <Edit3 className="w-4 h-4 mr-2" />Edit
                </Button>
                <Button onClick={handleCopy}>
                  {copied ? <><Check className="w-4 h-4 mr-2" />Copied</> : <><Copy className="w-4 h-4 mr-2" />Copy Markdown</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
