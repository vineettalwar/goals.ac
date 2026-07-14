import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Edit3,
  Eye,
  RefreshCw,
  Save,
  BookOpen,
  Send,
  ExternalLink,
  Shuffle,
  Trash2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { type ContentPiece, FORMAT_META } from "./content-piece-types";

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

export function ContentPieceDetailView(props: {
  piece: ContentPiece;
  isEditing: boolean;
  isSaving: boolean;
  isRegenerating: boolean;
  copied: boolean;
  saveSuccess: boolean;
  isMarkingReady: boolean;
  editTitle: string;
  editBody: string;
  editStatus: string;
  editPlannedDate: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setPublishOpen: (v: boolean) => void;
  setRepurposeOpen: (v: boolean) => void;
  setIsEditing: (v: boolean) => void;
  setEditTitle: (v: string) => void;
  setEditBody: (v: string) => void;
  setEditStatus: (v: string) => void;
  setEditPlannedDate: (v: string) => void;
  handleCopy: () => void;
  handleSave: () => void;
  handleRegenerate: () => void;
  handleMarkReady: () => void;
  handleDelete: () => void;
  startEdit: () => void;
  cancelEdit: () => void;
}) {
  const {
    piece,
    isEditing,
    isSaving,
    isRegenerating,
    copied,
    saveSuccess,
    isMarkingReady,
    editTitle,
    editBody,
    editStatus,
    editPlannedDate,
    textareaRef,
    setPublishOpen,
    setRepurposeOpen,
    setIsEditing,
    setEditTitle,
    setEditBody,
    setEditStatus,
    setEditPlannedDate,
    handleCopy,
    handleSave,
    handleRegenerate,
    handleMarkReady,
    handleDelete,
    startEdit,
    cancelEdit,
  } = props;

  const meta = FORMAT_META[piece.formatType] ?? {
    label: piece.formatType,
    icon: BookOpen,
    color: "bg-muted text-muted-foreground",
  };
  const Icon = meta.icon;
  const statusColor = STATUS_COLORS[piece.status] ?? "bg-muted text-muted-foreground";
  const statusLabel = STATUS_LABELS[piece.status] ?? piece.status;

  return (
    <AppLayout>
      <SEO
        title={`${piece.title} | Content Studio | goals.ac`}
        description={`${meta.label} on ${piece.targetKeyword}`}
      />
      <div className="container mx-auto px-4 md:px-8 max-w-4xl py-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <Link
            to={`/projects/${piece.websiteProjectId}/content-studio`}
            className="hover:text-foreground transition-colors"
          >
            Content Studio
          </Link>
          <span>›</span>
          <span className="text-foreground truncate max-w-[200px]">{piece.title}</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className={`p-2 rounded-lg ${meta.color}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {meta.label}
              </span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {piece.wordCount.toLocaleString()} words
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(piece.createdAt), "d MMM yyyy")}
                </span>
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
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRepurposeOpen(true)}
              title="Convert to another format"
            >
              <Shuffle className="w-4 h-4 mr-1.5" />
              Repurpose
            </Button>
            {piece.status !== "published" && (
              <Button size="sm" onClick={() => setPublishOpen(true)}>
                <Send className="w-4 h-4 mr-1.5" />
                Publish
              </Button>
            )}
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Edit3 className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <Eye className="w-4 h-4 mr-1.5" />
                  Preview
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
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
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {piece.status === "draft" && !isEditing && (
          <div className="flex items-center justify-between gap-4 mb-6 px-4 py-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Review the draft below, then mark it ready when you want to publish.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkReady}
              disabled={isMarkingReady}
              className="shrink-0"
            >
              {isMarkingReady ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Mark as ready
                </>
              )}
            </Button>
          </div>
        )}

        {piece.publishedUrl && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
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
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                View
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
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save changes
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-tight">
              {piece.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-8 pb-5 border-b border-border/50 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Circle className="w-2 h-2 fill-primary text-primary" />
                {piece.targetKeyword}
              </span>
              {piece.wordCount > 0 && <span>{piece.wordCount.toLocaleString()} words</span>}
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
                  <Shuffle className="w-4 h-4 mr-2" />
                  Repurpose
                </Button>
                <Button variant="outline" onClick={startEdit}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {piece.status !== "published" && (
                  <Button variant="outline" onClick={() => setPublishOpen(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Publish
                  </Button>
                )}
                <Button onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Markdown
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
