import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ImageIcon, Loader2, PenLine, RefreshCw } from "lucide-react";
import { cn } from "../cn";
import { contentPieceCanHumanize, formatHumanizationAuditLine } from "../content-piece/types";
import { SocialPostPreview } from "./social-post-preview";
import {
  INSTAGRAM_IMAGE_REQUIRED_MESSAGE,
  SOCIAL_PLATFORM_OPTIONS,
  isPublicHttpImageUrl,
  isSocialOverCharLimit,
  resolveSocialPieceImageUrl,
  resolveSocialPiecePublicImageUrl,
  resolveSocialPlatformId,
  type SocialComposedPiece,
  type SocialComposerParent,
  type SocialPlatformId,
} from "./types";
import type { SocialHubLinkProps } from "./social-queue-panel";

function isHttpsImageUrl(url: string): boolean {
  return /^https:\/\//i.test(url.trim()) && isPublicHttpImageUrl(url);
}

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
  attachingImage = false,
  onAttachFeaturedImageUrl,
  onUseStockImage,
  onHumanize,
  humanizingPieceId = null,
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
  attachingImage?: boolean;
  onAttachFeaturedImageUrl?: (parentPieceId: number, url: string) => void | Promise<void>;
  onUseStockImage?: (parentPieceId: number) => void | Promise<void>;
  onHumanize?: (pieceId: number) => void | Promise<void>;
  humanizingPieceId?: number | null;
}) {
  const [search, setSearch] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<SocialPlatformId>>(
    () => new Set(["linkedin", "twitter"]),
  );
  const [imageUrlDraft, setImageUrlDraft] = useState("");

  const filteredParents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parents.slice(0, 30);
    return parents.filter((parent) => parent.title.toLowerCase().includes(q)).slice(0, 30);
  }, [parents, search]);

  const selectedParent = useMemo(
    () => parents.find((parent) => parent.id === selectedParentId) ?? null,
    [parents, selectedParentId],
  );

  useEffect(() => {
    setImageUrlDraft("");
  }, [selectedParentId]);

  const parentImageUrl = selectedParent ? resolveSocialPieceImageUrl(selectedParent) : undefined;
  const parentPublicImageUrl = selectedParent
    ? resolveSocialPiecePublicImageUrl(selectedParent)
    : undefined;

  const instagramSelected = selectedPlatforms.has("instagram");
  const parentHasImage = Boolean(parentPublicImageUrl);
  const instagramBlocked = instagramSelected && Boolean(selectedParent) && !parentHasImage;
  const canAttachImage =
    Boolean(selectedParent) &&
    instagramBlocked &&
    (Boolean(onAttachFeaturedImageUrl) || Boolean(onUseStockImage));

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
                ) : (
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                    {platform.limit.toLocaleString()} chars
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {instagramSelected && parentHasImage && parentPublicImageUrl ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">Instagram image: {parentPublicImageUrl}</span>
          </div>
        ) : null}
        {instagramBlocked ? (
          <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{INSTAGRAM_IMAGE_REQUIRED_MESSAGE}</span>
            </div>
            {canAttachImage ? (
              <div className="space-y-2 pl-6">
                {onAttachFeaturedImageUrl ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="Paste HTTPS image URL…"
                      value={imageUrlDraft}
                      disabled={attachingImage}
                      onChange={(event) => setImageUrlDraft(event.target.value)}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData("text").trim();
                        if (isHttpsImageUrl(pasted)) {
                          event.preventDefault();
                          setImageUrlDraft(pasted);
                        }
                      }}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm"
                      aria-label="HTTPS featured image URL for Instagram"
                    />
                    <button
                      type="button"
                      disabled={attachingImage || !isHttpsImageUrl(imageUrlDraft) || !selectedParentId}
                      onClick={() => {
                        if (!selectedParentId || !onAttachFeaturedImageUrl) return;
                        void onAttachFeaturedImageUrl(selectedParentId, imageUrlDraft.trim());
                      }}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
                    >
                      Attach URL
                    </button>
                  </div>
                ) : null}
                {onUseStockImage ? (
                  <button
                    type="button"
                    disabled={attachingImage || !selectedParentId}
                    onClick={() => {
                      if (!selectedParentId || !onUseStockImage) return;
                      void onUseStockImage(selectedParentId);
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
                  >
                    {attachingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Use stock image
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={
          composing || !selectedParentId || selectedPlatforms.size === 0 || instagramBlocked
        }
        onClick={() => {
          if (!selectedParentId || instagramBlocked) return;
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
              Variants are queued with suggested schedule slots. Red counts mean the body is over
              that platform&apos;s limit.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {composed.map((piece) => {
              const platformId = resolveSocialPlatformId(piece);
              const overLimit = isSocialOverCharLimit(piece.bodyMarkdown, platformId);
              const isInstagram =
                platformId === "instagram" || piece.formatType === "instagram_post";
              const imageUrl =
                resolveSocialPieceImageUrl(piece) ?? parentImageUrl ?? undefined;
              const publicImageUrl =
                resolveSocialPiecePublicImageUrl(piece) ??
                parentPublicImageUrl ??
                undefined;
              const missingInstagramImage = isInstagram && !publicImageUrl;
              const canHumanize = contentPieceCanHumanize(piece.formatType);
              const isHumanizingThis = humanizingPieceId === piece.id;
              const humanizationAudit = piece.pieceMetadata?.humanizationAudit;
              return (
                <div key={piece.id} className="space-y-2">
                  <SocialPostPreview
                    publishPlatform={piece.publishPlatform}
                    formatType={piece.formatType}
                    title={piece.title}
                    bodyMarkdown={piece.bodyMarkdown}
                    imageUrl={imageUrl}
                    lineClamp={8}
                    className={overLimit ? "ring-1 ring-destructive/40" : undefined}
                  />
                  <div className="flex flex-wrap items-center gap-2 px-0.5">
                    {piece.scheduledAt ? (
                      <span className="text-xs text-muted-foreground">
                        Scheduled {new Date(piece.scheduledAt).toLocaleString()}
                      </span>
                    ) : null}
                    {missingInstagramImage ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
                        Needs image
                      </span>
                    ) : null}
                    {canHumanize && onHumanize ? (
                      <button
                        type="button"
                        onClick={() => void onHumanize(piece.id)}
                        disabled={isHumanizingThis}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-sm hover:bg-muted/50 disabled:opacity-50"
                        title="Rewrite for natural human rhythm without full regeneration"
                      >
                        {isHumanizingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <PenLine className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {isHumanizingThis ? "Humanizing…" : "Humanize"}
                      </button>
                    ) : null}
                    {renderLink({
                      href: pieceHref(piece.id),
                      className:
                        "inline-flex h-8 items-center rounded-lg border border-input px-3 text-sm hover:bg-muted/50",
                      children: overLimit ? "Edit to fit limit" : "Edit in studio",
                    })}
                  </div>
                  {missingInstagramImage ? (
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      {INSTAGRAM_IMAGE_REQUIRED_MESSAGE}
                    </p>
                  ) : null}
                  {humanizationAudit ? (
                    <p className="text-xs text-muted-foreground">
                      {formatHumanizationAuditLine(humanizationAudit)}
                    </p>
                  ) : null}
                  {piece.pieceMetadata?.preHumanizeBodyMarkdown?.trim() ? (
                    <p className="text-xs text-muted-foreground">
                      Before/after snapshot saved.{" "}
                      {renderLink({
                        href: pieceHref(piece.id),
                        className: "font-medium text-foreground underline underline-offset-2",
                        children: "Open in Studio",
                      })}{" "}
                      to compare or revert.
                    </p>
                  ) : null}
                  {overLimit ? (
                    <p className="text-xs font-medium text-destructive">
                      Over the platform limit — trim before scheduling.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
