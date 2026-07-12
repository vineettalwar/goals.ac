"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send, Copy, Check, RefreshCw, Wand2, Save, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentMarkdown } from "@/components/content-markdown";
import { ArticleQualityPanel } from "@/components/article-quality-panel";
import { FORMAT_OPTIONS } from "@/lib/content-format-options";
import {
  type ContentFormatType,
  type PublishDestinationId,
  getConnectedDestinationsForFormat,
  getDestinationsForFormat,
  type CmsConnectionSnapshot,
} from "@/lib/publishing-destinations";
import type { ContentPieceRecord } from "@/lib/server/loaders";

interface ContentPieceClientProps {
  pieceId: string;
  initialPiece: ContentPieceRecord;
  initialCmsConnections: CmsConnectionSnapshot;
}

function defaultPublishPlatform(
  formatType: string,
  connections: CmsConnectionSnapshot,
): PublishDestinationId {
  const connected = getConnectedDestinationsForFormat(formatType as ContentFormatType, connections);
  return connected[0]?.id ?? "wordpress";
}

export function ContentPieceClient({
  pieceId,
  initialPiece,
  initialCmsConnections,
}: ContentPieceClientProps) {
  const router = useRouter();
  const [piece, setPiece] = useState(initialPiece);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(true);
  const [bodyDraft, setBodyDraft] = useState(initialPiece.bodyMarkdown ?? "");
  const [titleDraft, setTitleDraft] = useState(initialPiece.title ?? "");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [repurposeFormat, setRepurposeFormat] = useState("");
  const [repurposing, setRepurposing] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState<PublishDestinationId>(() =>
    defaultPublishPlatform(initialPiece.formatType, initialCmsConnections),
  );
  const [cmsConnections] = useState(initialCmsConnections);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
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
    const res = await fetch(`/api/content-pieces/${pieceId}/regenerate`, { method: "POST" });
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
    const res = await fetch(`/api/content-pieces/${pieceId}/repurpose`, {
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
    const res = await fetch(`/api/content-pieces/${pieceId}/publish`, {
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
    const res = await fetch(`/api/content-pieces/${pieceId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    router.push(`/projects/${piece.websiteProjectId}/content-studio`);
  }

  async function handleMarkReady() {
    const res = await fetch(`/api/content-pieces/${pieceId}`, {
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
    await navigator.clipboard.writeText(editing ? bodyDraft : piece.bodyMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const formatLabel =
    FORMAT_OPTIONS.find((o) => o.value === piece.formatType)?.label ?? piece.formatType;

  const publishDestinations = getDestinationsForFormat(piece.formatType as ContentFormatType);
  const connectedDestinations = getConnectedDestinationsForFormat(
    piece.formatType as ContentFormatType,
    cmsConnections,
  );

  return (
    <div className="px-8 py-8 max-w-6xl space-y-6">
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
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
          <RefreshCw className={regenerating ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Regenerate
        </Button>
        {piece.status === "draft" && (
          <Button variant="outline" size="sm" onClick={handleMarkReady}>
            Mark ready
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="paper-card p-4 rounded-xl space-y-3">
        <Label className="text-sm font-medium">Publish</Label>
        <div className="flex gap-2 flex-wrap items-center">
          <Select
            value={publishPlatform}
            onValueChange={(v) => setPublishPlatform(v as PublishDestinationId)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {publishDestinations.map((d) => (
                <SelectItem key={d.id} value={d.id} disabled={!d.isConnected(cmsConnections)}>
                  {d.label}
                  {!d.isConnected(cmsConnections) ? " (not connected)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishing || connectedDestinations.length === 0}
          >
            <Send className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish"}
          </Button>
          {connectedDestinations.length === 0 && (
            <Link
              href={`/projects/${piece.websiteProjectId}?tab=publishing`}
              className="text-xs text-primary hover:underline"
            >
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

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="space-y-6">
          <div className="paper-card rounded-xl p-8">
            {editing ? (
              <Textarea
                className="min-h-[400px] font-mono text-sm"
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
              />
            ) : preview ? (
              <div className="prose prose-sm max-w-none">
                <ContentMarkdown>{piece.bodyMarkdown}</ContentMarkdown>
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono">{piece.bodyMarkdown}</pre>
            )}
          </div>
        </div>

        {piece.bodyMarkdown && (
          <aside className="space-y-4 lg:sticky lg:top-6">
            <ArticleQualityPanel
              bodyMarkdown={piece.bodyMarkdown}
              metaTitle={piece.title}
              wordCount={piece.wordCount}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
