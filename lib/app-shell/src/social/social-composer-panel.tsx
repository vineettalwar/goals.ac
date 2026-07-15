import { useMemo, useState, type ReactNode } from "react";
import { Loader2, PenLine } from "lucide-react";
import { cn } from "../cn";
import {
  SOCIAL_PLATFORM_OPTIONS,
  type SocialComposedPiece,
  type SocialComposerParent,
  type SocialPlatformId,
} from "./types";
import type { SocialHubLinkProps } from "./social-queue-panel";

export function SocialComposerPanel({
  parents,
  parentsLoading,
  connected,
  composing,
  composed,
  pieceHref,
  integrationsHref,
  renderLink,
  onCompose,
}: {
  parents: SocialComposerParent[];
  parentsLoading: boolean;
  connected: Record<string, boolean>;
  composing: boolean;
  composed: SocialComposedPiece[] | null;
  pieceHref: (pieceId: number) => string;
  integrationsHref: string;
  renderLink: (props: SocialHubLinkProps) => ReactNode;
  onCompose: (parentPieceId: number, platforms: SocialPlatformId[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<SocialPlatformId>>(
    () => new Set(["linkedin", "twitter"]),
  );

  const filteredParents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents.slice(0, 30);
    return parents.filter((parent) => parent.title.toLowerCase().includes(q)).slice(0, 30);
  }, [parents, search]);

  function togglePlatform(id: SocialPlatformId) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="paper-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">1. Source content</h3>
          <p className="text-sm text-muted-foreground">
            Repurpose a blog or SEO article into platform-native posts.
          </p>
        </div>
        <input
          className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm"
          placeholder="Search articles…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {parentsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {filteredParents.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">No suitable articles found.</p>
            ) : (
              filteredParents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => setSelectedParentId(parent.id)}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                    selectedParentId === parent.id && "bg-primary/10 ring-1 ring-primary/30",
                  )}
                >
                  {parent.title}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {parent.formatType.replace(/_/g, " ")}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="paper-card p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">2. Platforms</h3>
          <p className="text-sm text-muted-foreground">
            Unconnected platforms are disabled.{" "}
            {renderLink({
              href: integrationsHref,
              className: "text-primary hover:underline",
              children: "Connect in Integrations",
            })}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SOCIAL_PLATFORM_OPTIONS.map((platform) => {
            const isConnected = connected[platform.id] ?? false;
            const checked = selectedPlatforms.has(platform.id);
            return (
              <label
                key={platform.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-border p-3 text-sm",
                  !isConnected && "opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  disabled={!isConnected}
                  checked={checked}
                  onChange={() => togglePlatform(platform.id)}
                />
                <span className="font-medium">{platform.label}</span>
                {!isConnected ? (
                  <span className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">
                    Not connected
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={composing || !selectedParentId || selectedPlatforms.size === 0}
        onClick={() => {
          if (!selectedParentId) return;
          onCompose(selectedParentId, [...selectedPlatforms]);
        }}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {composing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <PenLine className="h-4 w-4" />
            Generate for {selectedPlatforms.size} platform
            {selectedPlatforms.size === 1 ? "" : "s"}
          </>
        )}
      </button>

      {composed && composed.length > 0 ? (
        <div className="paper-card p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold">3. Preview</h3>
            <p className="text-sm text-muted-foreground">
              Variants are queued with suggested schedule slots.
            </p>
          </div>
          {composed.map((piece) => {
            const platform = SOCIAL_PLATFORM_OPTIONS.find((p) => p.id === piece.publishPlatform);
            const limit = platform?.limit ?? 3000;
            const len = piece.bodyMarkdown.length;
            return (
              <div key={piece.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {piece.publishPlatform ?? piece.formatType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {len}/{limit} chars
                  </span>
                  {len > limit ? (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      Over limit
                    </span>
                  ) : null}
                  {piece.scheduledAt ? (
                    <span className="text-xs text-muted-foreground">
                      Scheduled {new Date(piece.scheduledAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-medium">{piece.title}</p>
                <p className="line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">
                  {piece.bodyMarkdown}
                </p>
                {renderLink({
                  href: pieceHref(piece.id),
                  className:
                    "inline-flex h-8 items-center rounded-lg border border-input px-3 text-sm hover:bg-muted/50",
                  children: "Edit in studio",
                })}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
