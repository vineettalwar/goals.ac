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
import { useAuth } from "@/context/use-auth";
import {
  ArrowLeft, Copy, Check, Loader2, AlertCircle, Edit3, Eye,
  RefreshCw, Save, BookOpen, Newspaper, GraduationCap, Map,
  FileSearch, LayoutTemplate, Globe, ImageIcon, Trash2, Send, ExternalLink,
  Linkedin, Twitter, Instagram, Mail, Megaphone, MonitorPlay, Package, Radio, HelpCircle,
  Shuffle, CheckCircle2, Circle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  type ContentFormatType,
  type PublishDestinationId,
  getConnectedDestinationsForFormat,
  getPublishEndpoint,
  getConnectionSummary,
} from "@/lib/publishing-destinations";
import { PublishDialog } from "./content-piece-publish-dialog";
import { RepurposeDialog } from "./content-piece-repurpose-dialog";
import { API_BASE, FORMAT_META, type ContentPiece } from "./content-piece-types";

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

import { ContentPieceDetailView } from "./content-piece-detail-view";

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
  const cancelEdit = () => {
    if (!piece) return;
    setEditTitle(piece.title);
    setEditBody(piece.bodyMarkdown);
    setEditStatus(piece.status);
    setEditPlannedDate(piece.plannedDate ?? "");
    setIsEditing(false);
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

  return (
    <>
      <ContentPieceDetailView
        piece={piece}
        isEditing={isEditing}
        isSaving={isSaving}
        isRegenerating={isRegenerating}
        copied={copied}
        saveSuccess={saveSuccess}
        isMarkingReady={isMarkingReady}
        editTitle={editTitle}
        editBody={editBody}
        editStatus={editStatus}
        editPlannedDate={editPlannedDate}
        textareaRef={textareaRef}
        setPublishOpen={setPublishOpen}
        setRepurposeOpen={setRepurposeOpen}
        setIsEditing={setIsEditing}
        setEditTitle={setEditTitle}
        setEditBody={setEditBody}
        setEditStatus={setEditStatus}
        setEditPlannedDate={setEditPlannedDate}
        handleCopy={handleCopy}
        handleSave={handleSave}
        handleRegenerate={handleRegenerate}
        handleMarkReady={handleMarkReady}
        startEdit={startEdit}
        cancelEdit={cancelEdit}
      />
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
    </>
  );
}
