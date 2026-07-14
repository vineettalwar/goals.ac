"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import { toast } from "sonner";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", limit: 3000 },
  { id: "twitter", label: "X / Twitter", limit: 280 },
  { id: "instagram", label: "Instagram", limit: 2200 },
  { id: "facebook", label: "Facebook", limit: 63206 },
  { id: "bluesky", label: "Bluesky", limit: 300 },
  { id: "mastodon", label: "Mastodon", limit: 500 },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

const SOCIAL_FORMATS = new Set([
  "linkedin_post",
  "twitter_thread",
  "instagram_post",
  "facebook_post",
  "bluesky_post",
  "mastodon_post",
]);

type ParentPiece = {
  id: number;
  title: string;
  formatType: string;
  bodyMarkdown: string;
};

type ComposedPiece = {
  id: number;
  title: string;
  bodyMarkdown: string;
  formatType: string;
  publishPlatform: string | null;
  scheduledAt: string | null;
};

export function SocialComposerPanel({
  projectId,
  onComposed,
}: {
  projectId: string;
  onComposed: () => void;
}) {
  const [parents, setParents] = useState<ParentPiece[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformId>>(new Set(["linkedin", "twitter"]));
  const [generating, setGenerating] = useState(false);
  const [composed, setComposed] = useState<ComposedPiece[] | null>(null);

  const loadParents = useCallback(async () => {
    setLoadingParents(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/content-pieces`);
      if (!res.ok) throw new Error("Failed to load content");
      const data = (await res.json()) as ParentPiece[];
      setParents(
        data.filter(
          (p) => !SOCIAL_FORMATS.has(p.formatType) && (p.bodyMarkdown?.trim().length ?? 0) > 50,
        ),
      );
    } catch {
      toast.error("Could not load source content");
    } finally {
      setLoadingParents(false);
    }
  }, [projectId]);

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch(`/api/website-projects/${projectId}/cms-integrations`);
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, unknown>;
      setConnected({
        linkedin: Boolean(data.linkedin),
        twitter: Boolean(data.twitter),
        instagram: Boolean(data.meta),
        facebook: Boolean(data.meta),
        bluesky: Boolean(data.bluesky),
        mastodon: Boolean(data.mastodon),
      });
    } catch {
      /* optional */
    }
  }, [projectId]);

  useEffect(() => {
    void loadParents();
    void loadConnections();
  }, [loadParents, loadConnections]);

  const filteredParents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents.slice(0, 30);
    return parents.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 30);
  }, [parents, search]);

  function togglePlatform(id: PlatformId) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    if (!selectedParentId || selectedPlatforms.size === 0) {
      toast.error("Select a source article and at least one platform");
      return;
    }
    setGenerating(true);
    setComposed(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/social/composer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPieceId: selectedParentId,
          platforms: [...selectedPlatforms],
        }),
      });
      const data = (await res.json()) as { pieces?: ComposedPiece[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Composer failed");
      setComposed(data.pieces ?? []);
      toast.success(`Created ${data.pieces?.length ?? 0} platform variants`);
      onComposed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Composer failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Source content</CardTitle>
          <CardDescription>Repurpose a blog or SEO article into platform-native posts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search articles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loadingParents ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
              {filteredParents.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No suitable articles found.</p>
              ) : (
                filteredParents.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedParentId(p.id)}
                    className={cn(
                      "w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      selectedParentId === p.id && "bg-primary/10 ring-1 ring-primary/30",
                    )}
                  >
                    {p.title}
                    <span className="text-xs text-muted-foreground ml-2">{p.formatType.replace(/_/g, " ")}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Platforms</CardTitle>
          <CardDescription>
            Unconnected platforms are disabled.{" "}
            <Link href="/integrations" className="text-primary hover:underline">
              Connect in Integrations
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORMS.map((p) => {
              const isConnected = connected[p.id] ?? false;
              const checked = selectedPlatforms.has(p.id);
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-sm",
                    !isConnected && "opacity-50",
                  )}
                >
                  <input
                    type="checkbox"
                    disabled={!isConnected}
                    checked={checked}
                    onChange={() => togglePlatform(p.id)}
                  />
                  <span className="font-medium">{p.label}</span>
                  {!isConnected && <Badge variant="outline" className="ml-auto text-[10px]">Not connected</Badge>}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => void generate()} disabled={generating || !selectedParentId}>
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <PenLine className="h-4 w-4 mr-2" />
            Generate for {selectedPlatforms.size} platform{selectedPlatforms.size === 1 ? "" : "s"}
          </>
        )}
      </Button>

      {composed && composed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Preview</CardTitle>
            <CardDescription>Variants are queued with suggested schedule slots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {composed.map((piece) => {
              const platform = PLATFORMS.find((p) => p.id === piece.publishPlatform);
              const limit = platform?.limit ?? 3000;
              const len = piece.bodyMarkdown.length;
              return (
                <div key={piece.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{piece.publishPlatform ?? piece.formatType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {len}/{limit} chars
                    </span>
                    {len > limit && <Badge variant="destructive">Over limit</Badge>}
                    {piece.scheduledAt && (
                      <span className="text-xs text-muted-foreground">
                        Scheduled {new Date(piece.scheduledAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm">{piece.title}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{piece.bodyMarkdown}</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={contentPiecePath(projectId, piece.id)}>Edit in studio</Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
