"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, ExternalLink, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FORMAT_OPTIONS = [
  { value: "blog_post", label: "Blog Post" },
  { value: "news_article", label: "News Article" },
  { value: "tutorial", label: "Tutorial" },
  { value: "guide", label: "Guide" },
  { value: "whitepaper", label: "Whitepaper" },
  { value: "pillar_page", label: "Pillar Page" },
  { value: "location_page", label: "Location Page" },
  { value: "linkedin_post", label: "LinkedIn Post" },
  { value: "twitter_thread", label: "Twitter Thread" },
  { value: "email_sequence", label: "Email Sequence" },
  { value: "ad_copy", label: "Ad Copy" },
  { value: "faq_article", label: "FAQ Article" },
];

interface ContentPiece {
  id: number;
  title: string;
  formatType: string;
  targetKeyword: string;
  status: string;
  wordCount: number;
  createdAt: string;
}

export default function ContentStudioPage() {
  const params = useParams<{ id: string }>();
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    formatType: "blog_post",
    title: "",
    targetKeyword: "",
    additionalContext: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch(`/api/content-pieces?websiteProjectId=${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.pieces) setPieces(data.pieces);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleGenerate() {
    if (!form.title && !form.targetKeyword) {
      toast.error("Enter a title or target keyword");
      return;
    }

    setGenerating(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/content-pieces/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteProjectId: parseInt(params.id),
          formatType: form.formatType,
          title: form.title || undefined,
          targetKeyword: form.targetKeyword || undefined,
          additionalContext: form.additionalContext || undefined,
          stream: false,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) { toast.error("Generation failed"); return; }
      const { piece } = await res.json();
      setPieces((prev) => [piece, ...prev]);
      setShowForm(false);
      setForm({ formatType: "blog_post", title: "", targetKeyword: "", additionalContext: "" });
      toast.success("Content piece generated");
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error("Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate and manage content pieces for your website</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> New piece
        </Button>
      </div>

      {showForm && (
        <div className="paper-card p-6 rounded-xl space-y-4">
          <h2 className="font-semibold">Generate content</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <select
                className="w-full h-10 rounded-lg border border-[--border] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.formatType}
                onChange={(e) => setForm((p) => ({ ...p, formatType: e.target.value }))}
              >
                {FORMAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Target keyword</Label>
              <Input placeholder="e.g. B2B SaaS marketing" value={form.targetKeyword} onChange={(e) => setForm((p) => ({ ...p, targetKeyword: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input placeholder="Leave blank to auto-generate" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Additional context (optional)</Label>
            <Textarea placeholder="Any specific instructions, tone notes, or information to include…" rows={3} value={form.additionalContext} onChange={(e) => setForm((p) => ({ ...p, additionalContext: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <><Spinner size="sm" /> Generating…</> : "Generate"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16"><Spinner size="lg" /></div>
      ) : pieces.length === 0 ? (
        <div className="paper-card rounded-xl flex flex-col items-center justify-center p-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">No content yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate your first piece using the button above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pieces.map((piece) => (
            <div key={piece.id} className="paper-card rounded-xl p-5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <a href={`/content-piece/${piece.id}`} className="font-medium hover:text-primary truncate block">{piece.title}</a>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="muted">{FORMAT_OPTIONS.find((o) => o.value === piece.formatType)?.label ?? piece.formatType}</Badge>
                  {piece.targetKeyword && <span className="text-xs text-muted-foreground">{piece.targetKeyword}</span>}
                  <span className="text-xs text-muted-foreground">{piece.wordCount} words</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={piece.status === "published" ? "success" : piece.status === "generating" ? "warning" : "muted"}>
                  {piece.status}
                </Badge>
                <a href={`/content-piece/${piece.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
