"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, ExternalLink, MessageSquare } from "lucide-react";
import { FeatureStatusBadge } from "@/components/feature-status-badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProject } from "@/context/active-project";

type Thread = {
  subreddit: string;
  title: string;
  url: string;
  intentScore: number;
  suggestedReply: string;
};

export function RedditDiscoveryPanel({ embedded = false }: { embedded?: boolean }) {
  const { activeProjectId } = useActiveProject();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setThreads([]);
  }, [activeProjectId]);

  async function discover() {
    if (!activeProjectId) return;
    setLoading(true);
    const res = await fetch("/api/reddit-discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: activeProjectId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Discovery failed");
      return;
    }
    setThreads(data.threads ?? []);
  }

  function copyReply(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Reply copied to clipboard");
  }

  if (!activeProjectId) {
    return (
      <div className={embedded ? "max-w-3xl" : "px-8 py-8 max-w-3xl"}>
        {!embedded ? <h1 className="text-2xl font-bold mb-2">Reddit Discovery</h1> : null}
        <p className="text-muted-foreground mb-4">Select a project to find relevant threads.</p>
        <Button asChild><Link href="/projects">Go to projects</Link></Button>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "px-8 py-8 max-w-4xl space-y-6"}>
      <div className="flex items-start justify-between gap-4">
        {!embedded ? (
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Reddit Discovery</h1>
                <FeatureStatusBadge status="beta" />
              </div>
              <p className="text-sm text-muted-foreground">Find threads and draft replies — you post manually.</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Find threads and draft replies — you post manually.</p>
        )}
        <Button onClick={discover} disabled={loading}>
          {loading ? <Spinner size="sm" /> : "Find threads"}
        </Button>
      </div>

      {threads.length === 0 && !loading && (
        <div className="paper-card p-8 text-center text-muted-foreground text-sm">
          Click &quot;Find threads&quot; to discover Reddit discussions relevant to your brand keywords.
        </div>
      )}

      <ul className="space-y-4">
        {threads.map((t, i) => (
          <li key={i} className="paper-card p-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-xs text-primary font-medium">{t.subreddit}</p>
                <h3 className="font-semibold">{t.title}</h3>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary shrink-0">
                Intent {t.intentScore}
              </span>
            </div>
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-3">
              Open thread <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{t.suggestedReply}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => copyReply(t.suggestedReply)}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy reply
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
