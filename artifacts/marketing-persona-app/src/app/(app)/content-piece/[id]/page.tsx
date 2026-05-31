"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import ReactMarkdown from "react-markdown";

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
  const [piece, setPiece] = useState<ContentPiece | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/content-pieces/${params.id}`)
      .then((r) => r.json())
      .then((data) => setPiece(data.piece ?? data))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handlePublish(platform: "notion" | "webflow") {
    setPublishing(true);
    const res = await fetch(`/api/content-pieces/${params.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    if (!res.ok) { toast.error("Failed to publish"); setPublishing(false); return; }
    const data = await res.json();
    setPiece((prev) => prev ? { ...prev, status: "published" } : prev);
    toast.success(`Published to ${platform}`);
    setPublishing(false);
  }

  async function handleCopy() {
    if (!piece) return;
    await navigator.clipboard.writeText(piece.bodyMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="flex items-center justify-center p-16"><Spinner size="lg" /></div>;
  if (!piece) return <div className="p-8 text-muted-foreground">Content piece not found.</div>;

  return (
    <div className="px-8 py-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${piece.websiteProjectId}/content-studio`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold leading-tight">{piece.title}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="muted">{piece.formatType.replace(/_/g, " ")}</Badge>
            {piece.targetKeyword && <Badge variant="muted">{piece.targetKeyword}</Badge>}
            <span className="text-xs text-muted-foreground">{piece.wordCount} words</span>
            <Badge variant={piece.status === "published" ? "success" : "muted"}>{piece.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </Button>
          <Button size="sm" onClick={() => handlePublish("notion")} disabled={publishing}>
            <Send className="h-4 w-4" /> Publish to Notion
          </Button>
        </div>
      </div>

      <div className="paper-card rounded-xl p-8 prose prose-sm max-w-none">
        <ReactMarkdown>{piece.bodyMarkdown}</ReactMarkdown>
      </div>
    </div>
  );
}
