"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send, Copy, Check, RefreshCw, Wand2, Save, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import { FORMAT_OPTIONS } from "@/components/content-studio/content-studio-client";
import {
  type ContentFormatType,
  type PublishDestinationId,
  getConnectedDestinationsForFormat,
  getDestinationsForFormat,
  type CmsConnectionSnapshot,
} from "@/lib/publishing-destinations";

interface ContentPiece {
  id: number;
  title: string;
  formatType: string;
  targetKeyword: string;
  bodyMarkdown: string;
  status: string;
  wordCount: number;
  websiteProjectId: number;
  createdAt: string;
}

export default function ContentPiecePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [piece, setPiece] = useState<ContentPiece | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(true);
  const [bodyDraft, setBodyDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [repurposeFormat, setRepurposeFormat] = useState("");
  const [repurposing, setRepurposing] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState<PublishDestinationId>("wordpress");
  const [cmsConnections, setCmsConnections] = useState<CmsConnectionSnapshot>({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/content-pieces/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.piece ?? data;
        setPiece(p);
        setBodyDraft(p.bodyMarkdown ?? "");
        setTitleDraft(p.title ?? "");
        if (p.websiteProjectId) {
          fetch(`/api/website-projects/${p.websiteProjectId}/cms-integrations`)
            .then((r) => (r.ok ? r.json() : {}))
            .then((connections) => {
              setCmsConnections(connections);
              const format = p.formatType as ContentFormatType;
              const connected = getConnectedDestinationsForFormat(format, connections);
              if (connected[0]) setPublishPlatform(connected[0].id);
            });
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/content-pieces/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft, bodyMarkdown: bodyDraft }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setEditing(false);
    toast.success("Saved");
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const res = await fetch(`/api/content-pieces/${params.id}/regenerate`, { method: "POST" });
    setRegenerating(false);
    if (!res.ok) {
      toast.error("Regeneration failed");
      return;
    }
    const updated = await res.json();
    setPiece(updated);
    setBodyDraft(updated.bodyMarkdown);
    setTitleDraft(updated.title);
    toast.success("Regenerated");
  }

  async function handleRepurpose() {
    if (!repurposeFormat) {
      toast.error("Select a target format");
      return;
    }
    setRepurposing(true);
    const res = await fetch(`/api/content-pieces/${params.id}/repurpose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetFormat: repurposeFormat }),
    });
    setRepurposing(false);
    if (!res.ok) {
      toast.error("Repurpose failed");
      return;
    }
    const newPiece = await res.json();
    toast.success("Repurposed — opening new piece");
    router.push(`/content-piece/${newPiece.id}`);
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`/api/content-pieces/${params.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: publishPlatform }),
    });
    setPublishing(false);
    if (!res.ok) {
      toast.error("Failed to publish");
      return;
    }
    const updated = await res.json();
    setPiece((prev) => (prev ? { ...prev, status: "published", ...(updated.piece ?? updated) } : prev));
    toast.success(`Published to ${publishPlatform}`);
  }

  async function handleDelete() {
    if (!confirm("Delete this content piece?")) return;
    setDeleting(true);
    const res = await fetch(`/api/content-pieces/${params.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    router.push(`/projects/${piece?.websiteProjectId}/content-studio`);
  }

  async function handleMarkReady() {
    const res = await fetch(`/api/content-pieces/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ready" }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    const updated = await res.json();
    setPiece(updated.piece ?? updated);
    toast.success("Marked as ready");
  }

  async function handleCopy() {
    if (!piece) return;
    await navigator.clipboard.writeText(editing ? bodyDraft : piece.bodyMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!piece) return <div className="p-8 text-muted-foreground">Content piece not found.</div>;

  const formatLabel =
    FORMAT_OPTIONS.find((o) => o.value === piece.formatType)?.label ?? piece.formatType;

  const publishDestinations = piece
    ? getDestinationsForFormat(piece.formatType as ContentFormatType)
    : [];
  const connectedDestinations = piece
    ? getConnectedDestinationsForFormat(piece.formatType as ContentFormatType, cmsConnections)
    : [];

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <div className="flex items-start gap-3">
        <Link href={`/projects/${piece.websiteProjectId}/content-studio`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              className="text-2xl font-bold w-full bg-transparent border-b border-border focus:outline-hidden"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
          ) : (
            <h1 className="text-2xl font-bold leading-tight">{piece.title}</h1>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="muted">{formatLabel}</Badge>
            {piece.targetKeyword && <Badge variant="muted">{piece.targetKeyword}</Badge>}
            <span className="text-xs text-muted-foreground">{piece.wordCount} words</span>
            <Badge variant={piece.status === "published" ? "success" : "muted"}>{piece.status}</Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
          <Pencil className="h-4 w-4" /> {editing ? "Cancel edit" : "Edit"}
        </Button>
        {editing && (
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>
          <Eye className="h-4 w-4" /> {preview ? "Raw" : "Preview"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
          <RefreshCw className={regenerating ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Regenerate
        </Button>
        {piece.status === "draft" && (
          <Button variant="outline" size="sm" onClick={handleMarkReady}>Mark ready</Button>
        )}
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="paper-card p-4 rounded-xl space-y-3">
        <Label className="text-sm font-medium">Publish</Label>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={publishPlatform} onValueChange={(v) => setPublishPlatform(v as PublishDestinationId)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {publishDestinations.map((d) => (
                <SelectItem key={d.id} value={d.id} disabled={!d.isConnected(cmsConnections)}>
                  {d.label}{!d.isConnected(cmsConnections) ? " (not connected)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handlePublish} disabled={publishing || connectedDestinations.length === 0}>
            <Send className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish"}
          </Button>
          {connectedDestinations.length === 0 && (
            <Link href={`/projects/${piece.websiteProjectId}?tab=publishing`} className="text-xs text-primary hover:underline">
              Connect a destination
            </Link>
          )}
        </div>
      </div>

      <div className="paper-card p-4 rounded-xl space-y-3">
        <Label className="text-sm font-medium">Repurpose to another format</Label>
        <div className="flex gap-2 flex-wrap">
          <select
            className="h-9 rounded-lg border border-input bg-card px-3 text-sm flex-1 min-w-[200px]"
            value={repurposeFormat}
            onChange={(e) => setRepurposeFormat(e.target.value)}
          >
            <option value="">Select format…</option>
            {FORMAT_OPTIONS.filter((o) => o.value !== piece.formatType).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleRepurpose} disabled={repurposing}>
            <Wand2 className="h-4 w-4" /> Repurpose
          </Button>
        </div>
      </div>

      <div className="paper-card rounded-xl p-8">
        {editing ? (
          <Textarea
            className="min-h-[400px] font-mono text-sm"
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
          />
        ) : preview ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{piece.bodyMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <pre className="text-sm whitespace-pre-wrap font-mono">{piece.bodyMarkdown}</pre>
        )}
      </div>
    </div>
  );
}
