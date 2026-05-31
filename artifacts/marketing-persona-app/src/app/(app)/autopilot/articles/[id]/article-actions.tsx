"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ArticleActionsProps {
  articleId: number;
  status: string;
  hasWordPress: boolean;
  publishedUrl?: string;
}

export function ArticleActions({ articleId, status, hasWordPress, publishedUrl }: ArticleActionsProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch(`/api/autopilot-articles/${articleId}/publish`, { method: "POST" });
    setPublishing(false);

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Publish failed" }));
      toast.error(error);
      return;
    }

    const { url } = await res.json();
    toast.success("Published to WordPress!");
    if (url) window.open(url, "_blank");
    router.refresh();
  }

  if (status === "published" && publishedUrl) {
    return (
      <a
        href={publishedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" /> View on site
      </a>
    );
  }

  if (status === "ready") {
    return (
      <div className="flex gap-2">
        {hasWordPress && (
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <><Spinner size="sm" className="border-white/30 border-t-white" /> Publishing...</>
            ) : (
              "Publish to WordPress"
            )}
          </Button>
        )}
        {!hasWordPress && (
          <Button variant="outline" asChild>
            <a href="/autopilot/settings">Connect WordPress first</a>
          </Button>
        )}
      </div>
    );
  }

  return null;
}
