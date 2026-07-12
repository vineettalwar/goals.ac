"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, ChevronDown, Send } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface IntegrationConnectionSummary {
  id: number;
  provider: "ghost" | "webhook";
  name: string;
}

interface ArticleActionsProps {
  articleId: number;
  status: string;
  hasWordPress: boolean;
  publishedUrl?: string;
  companyId: number;
}

export function ArticleActions({ articleId, status, hasWordPress, publishedUrl, companyId }: ArticleActionsProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [connections, setConnections] = useState<IntegrationConnectionSummary[]>([]);

  useEffect(() => {
    fetch(`/api/integrations?companyId=${companyId}`)
      .then((r) => r.json())
      .then(({ connections: list }) => setConnections(list ?? []))
      .catch(() => setConnections([]));
  }, [companyId]);

  async function handlePublishWordPress() {
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

  async function handlePublishConnection(connection: IntegrationConnectionSummary) {
    setPublishing(true);
    const res = await fetch(`/api/integrations/${connection.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    });
    setPublishing(false);

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Publish failed" }));
      toast.error(error);
      return;
    }

    const { url } = await res.json();
    toast.success(`Published to ${connection.name}!`);
    if (url && connection.provider === "ghost") window.open(url, "_blank");
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
    const hasAnyTarget = hasWordPress || connections.length > 0;

    if (!hasAnyTarget) {
      return (
        <Button variant="outline" asChild>
          <a href="/integrations">Connect a publisher first</a>
        </Button>
      );
    }

    return (
      <div className="flex gap-2">
        {hasWordPress && (
          <Button onClick={handlePublishWordPress} disabled={publishing}>
            {publishing ? (
              <><Spinner size="sm" className="border-white/30 border-t-white" /> Publishing...</>
            ) : (
              "Publish to WordPress"
            )}
          </Button>
        )}

        {connections.length > 0 && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant={hasWordPress ? "outline" : "default"} disabled={publishing}>
                <Send className="h-3.5 w-3.5" /> Publish to... <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[220px] rounded-lg border border-border bg-card p-1 shadow-lg"
              >
                {connections.map((c) => (
                  <DropdownMenu.Item
                    key={c.id}
                    onSelect={() => handlePublishConnection(c)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm outline-hidden",
                      "hover:bg-secondary focus:bg-secondary"
                    )}
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{c.provider}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    );
  }

  return null;
}
