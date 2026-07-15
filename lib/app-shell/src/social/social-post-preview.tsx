import { cn } from "../cn";
import {
  getSocialPlatformLimit,
  resolveSocialPlatformId,
  socialPostCharCount,
  type SocialPlatformId,
} from "./types";

const SOCIAL_PLATFORM_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  instagram: "Instagram",
  facebook: "Facebook",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

function PlatformChrome({ platformId }: { platformId: SocialPlatformId | null }) {
  if (platformId === "twitter") {
    return (
      <div className="flex items-center gap-2.5 border-b border-border/70 pb-2.5">
        <div className="h-9 w-9 shrink-0 rounded-full bg-secondary" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-20 rounded-sm bg-foreground/15" aria-hidden />
            <div className="h-2 w-14 rounded-sm bg-muted-foreground/25" aria-hidden />
          </div>
          <div className="h-2 w-16 rounded-sm bg-muted-foreground/20" aria-hidden />
        </div>
      </div>
    );
  }

  if (platformId === "linkedin") {
    return (
      <div className="flex items-center gap-2.5 border-b border-border/70 pb-2.5">
        <div
          className="h-10 w-10 shrink-0 rounded-full bg-primary/15 ring-1 ring-primary/20"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-2.5 w-28 rounded-sm bg-foreground/15" aria-hidden />
          <div className="h-2 w-36 rounded-sm bg-muted-foreground/20" aria-hidden />
          <div className="h-1.5 w-16 rounded-sm bg-muted-foreground/15" aria-hidden />
        </div>
      </div>
    );
  }

  if (platformId === "instagram") {
    return (
      <div className="flex items-center gap-2.5 border-b border-border/70 pb-2.5">
        <div
          className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary/30 via-secondary to-primary/10 ring-1 ring-border"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="h-2.5 w-24 rounded-sm bg-foreground/15" aria-hidden />
          <div className="h-1.5 w-12 rounded-sm bg-muted-foreground/20" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 border-b border-border/70 pb-2.5">
      <div className="h-9 w-9 shrink-0 rounded-full bg-secondary" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-2.5 w-24 rounded-sm bg-foreground/15" aria-hidden />
        <div className="h-2 w-20 rounded-sm bg-muted-foreground/20" aria-hidden />
      </div>
    </div>
  );
}

export function SocialPostPreview({
  platform,
  publishPlatform,
  formatType,
  title,
  bodyMarkdown,
  imageUrl,
  lineClamp = 8,
  className,
}: {
  platform?: string | null;
  publishPlatform?: string | null;
  formatType?: string | null;
  title?: string | null;
  bodyMarkdown?: string | null;
  imageUrl?: string | null;
  lineClamp?: 2 | 4 | 6 | 8;
  className?: string;
}) {
  const platformId = resolveSocialPlatformId({ platform, publishPlatform, formatType });
  const limit = getSocialPlatformLimit(platformId);
  const len = socialPostCharCount(bodyMarkdown);
  const overLimit = len > limit;
  const label =
    SOCIAL_PLATFORM_LABEL[platformId ?? ""] ??
    publishPlatform ??
    platform ??
    formatType?.replace(/_/g, " ") ??
    "Post";

  const clampClass =
    lineClamp === 2
      ? "line-clamp-2"
      : lineClamp === 4
        ? "line-clamp-4"
        : lineClamp === 6
          ? "line-clamp-6"
          : "line-clamp-8";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        platformId === "linkedin" && "rounded-lg",
        platformId === "twitter" && "rounded-2xl",
        className,
      )}
    >
      <div className="space-y-3 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-foreground/80">
            {label}
          </span>
          <span
            className={cn(
              "tabular-nums text-xs",
              overLimit ? "font-medium text-destructive" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {len}/{limit}
            {overLimit ? " — over limit" : ""}
          </span>
        </div>

        <PlatformChrome platformId={platformId} />

        {platformId === "instagram" && imageUrl ? (
          <div className="overflow-hidden rounded-md border border-border bg-secondary/40">
            <img
              src={imageUrl}
              alt=""
              className="aspect-square w-full max-h-56 object-cover"
            />
          </div>
        ) : null}

        {title ? <p className="text-sm font-medium leading-snug text-foreground">{title}</p> : null}

        {bodyMarkdown ? (
          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground",
              clampClass,
              platformId === "twitter" && "text-[15px] text-foreground/90",
            )}
          >
            {bodyMarkdown}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No body yet.</p>
        )}

        {platformId !== "instagram" && imageUrl ? (
          <div className="overflow-hidden rounded-lg border border-border bg-secondary/30">
            <img src={imageUrl} alt="" className="max-h-40 w-full object-cover" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
