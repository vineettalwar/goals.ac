import { cn } from "../cn";
import {
  getSocialPlatformLimit,
  resolveSocialPlatformId,
  socialPostCharCount,
  type SocialPlatformId,
} from "./types";
import { isTwitterThreadOverLimit, splitTwitterThread } from "./twitter-thread-parse";

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
      <div className="flex items-center gap-2.5 pb-1">
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
      <div className="flex items-center gap-2.5 pb-1">
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
      <div className="flex items-center gap-2.5 pb-1">
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

  if (platformId === "facebook") {
    return (
      <div className="flex items-center gap-2.5 pb-1">
        <div
          className="h-10 w-10 shrink-0 rounded-full bg-[#1877F2]/15 ring-1 ring-[#1877F2]/30"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">Page name</p>
          <p className="text-xs text-muted-foreground">Just now · Public</p>
        </div>
      </div>
    );
  }

  if (platformId === "bluesky") {
    return (
      <div className="flex items-center gap-2.5 pb-1">
        <div
          className="h-9 w-9 shrink-0 rounded-full bg-[#0085FF]/15 ring-1 ring-[#0085FF]/25"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-20 rounded-sm bg-foreground/15" aria-hidden />
            <div className="h-2 w-16 rounded-sm bg-[#0085FF]/25" aria-hidden />
          </div>
          <div className="h-2 w-14 rounded-sm bg-muted-foreground/20" aria-hidden />
        </div>
      </div>
    );
  }

  if (platformId === "mastodon") {
    return (
      <div className="flex items-center gap-2.5 pb-1">
        <div
          className="h-9 w-9 shrink-0 rounded-full bg-[#6364FF]/15 ring-1 ring-[#6364FF]/30"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-20 rounded-sm bg-foreground/15" aria-hidden />
            <div className="h-2 w-16 rounded-sm bg-[#6364FF]/20" aria-hidden />
          </div>
          <div className="h-2 w-24 rounded-sm bg-muted-foreground/20" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 pb-1">
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
  variant = "card",
  className,
}: {
  platform?: string | null;
  publishPlatform?: string | null;
  formatType?: string | null;
  title?: string | null;
  bodyMarkdown?: string | null;
  imageUrl?: string | null;
  lineClamp?: 2 | 3 | 4 | 6 | 8;
  /** `plain` = no nested border/shadow (use inside an outer card). */
  variant?: "card" | "plain";
  className?: string;
}) {
  const platformId = resolveSocialPlatformId({ platform, publishPlatform, formatType });
  const limit = getSocialPlatformLimit(platformId);
  const tweets =
    platformId === "twitter" ? splitTwitterThread(bodyMarkdown ?? "", Number.MAX_SAFE_INTEGER) : null;
  const len =
    tweets && tweets.length > 0
      ? Math.max(...tweets.map((t) => t.length))
      : socialPostCharCount(bodyMarkdown);
  const overLimit =
    platformId === "twitter"
      ? isTwitterThreadOverLimit(bodyMarkdown ?? "", limit)
      : len > limit;
  const nearLimit = !overLimit && len >= Math.floor(limit * 0.9);
  const label =
    SOCIAL_PLATFORM_LABEL[platformId ?? ""] ??
    publishPlatform ??
    platform ??
    formatType?.replace(/_/g, " ") ??
    "Post";

  const clampClass =
    lineClamp === 2
      ? "line-clamp-2"
      : lineClamp === 3
        ? "line-clamp-3"
        : lineClamp === 4
          ? "line-clamp-4"
          : lineClamp === 6
            ? "line-clamp-6"
            : "line-clamp-8";

  return (
    <div
      className={cn(
        "overflow-hidden",
        variant === "card" &&
          cn(
            "rounded-xl border border-border bg-card",
            platformId === "linkedin" && "rounded-lg",
            platformId === "twitter" && "rounded-2xl",
          ),
        className,
      )}
    >
      <div className={cn("space-y-3", variant === "card" ? "p-4 sm:p-5" : "px-0 py-1")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-foreground/80">
            {label}
          </span>
          <span
            className={cn(
              "tabular-nums text-xs",
              overLimit
                ? "font-medium text-destructive"
                : nearLimit
                  ? "font-medium text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {len}/{limit}
            {tweets && tweets.length > 1 ? ` · ${tweets.length} tweets` : ""}
            {overLimit ? " — over limit" : nearLimit ? " — near limit" : ""}
          </span>
        </div>

        <PlatformChrome platformId={platformId} />

        {platformId === "instagram" && imageUrl ? (
          <div className="overflow-hidden rounded-md bg-secondary/40">
            <img
              src={imageUrl}
              alt=""
              className="aspect-square w-full max-h-56 object-cover"
            />
          </div>
        ) : null}

        {title ? (
          <p className="pr-1 text-sm font-medium leading-snug text-foreground">{title}</p>
        ) : null}

        {bodyMarkdown ? (
          <p
            className={cn(
              // Avoid whitespace-pre-wrap with line-clamp — it breaks truncation and dumps full articles.
              "overflow-hidden text-sm leading-relaxed text-muted-foreground",
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
          <div className="overflow-hidden rounded-lg bg-secondary/30">
            <img src={imageUrl} alt="" className="max-h-40 w-full object-cover" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
