import { cn } from "../cn";
import { splitTwitterThread } from "../social/twitter-thread-parse";

const TWEET_LIMIT = 280;

export function TwitterThreadPreview({
  bodyMarkdown,
  className,
}: {
  bodyMarkdown: string;
  className?: string;
}) {
  const tweets = splitTwitterThread(bodyMarkdown, Number.MAX_SAFE_INTEGER);
  if (tweets.length === 0) {
    return <p className="text-sm text-muted-foreground">No tweets yet.</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-muted-foreground">
        {tweets.length} tweet{tweets.length === 1 ? "" : "s"} · each max {TWEET_LIMIT} characters
      </p>
      {tweets.map((tweet, index) => {
        const over = tweet.length > TWEET_LIMIT;
        return (
          <article
            key={`${index}-${tweet.slice(0, 24)}`}
            className={cn(
              "rounded-2xl border border-border bg-card p-4 shadow-sm",
              over && "border-destructive/40",
            )}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="h-9 w-9 shrink-0 rounded-full bg-secondary ring-1 ring-border"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-semibold text-foreground">You</span>
                  <span className="truncate text-xs text-muted-foreground">@you · {index + 1}/</span>
                </div>
              </div>
              <span
                className={cn(
                  "tabular-nums text-xs",
                  over ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                {tweet.length}/{TWEET_LIMIT}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
              {tweet}
            </p>
            {over ? (
              <p className="mt-2 text-xs text-destructive">
                Over limit — shorten before publish.
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
