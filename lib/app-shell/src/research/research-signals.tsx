import type { ReactNode } from "react";
import { AlertCircle, Copy, ExternalLink, FileText, Loader2, MessageSquare } from "lucide-react";
import { cn } from "../cn";
import { btnOutline, btnPrimary, PanelLoading, StatusPill } from "../section-panels/shared";
import type { RedditThread, ResearchActionPaths, ResearchLinkProps } from "./types";

function ManualAssistBanner() {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100"
      role="status"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">Manual assist — we never post for you</p>
        <p className="text-amber-900/90 dark:text-amber-100/90">
          Threads come from Reddit&apos;s public search (real posts). Reply text is an AI draft —
          copy, edit, and post yourself.
        </p>
      </div>
    </div>
  );
}

export function ResearchSignalsView({
  projectId,
  threads,
  loading,
  discovering,
  error,
  onDiscover,
  onCopyReply,
  projectsHref = "/projects",
  paths,
  renderLink,
}: {
  projectId?: string | null;
  threads?: RedditThread[];
  loading?: boolean;
  discovering?: boolean;
  error?: string | null;
  onDiscover?: () => void;
  onCopyReply?: (text: string) => void;
  projectsHref?: string;
  paths?: ResearchActionPaths;
  renderLink?: (props: ResearchLinkProps) => ReactNode;
}) {
  if (!projectId) {
    return (
      <div className="paper-card max-w-3xl space-y-4 p-6">
        <h2 className="text-lg font-semibold">Reddit signals</h2>
        <p className="text-sm text-muted-foreground">
          Select a project to search Reddit for discussions that match your brand keywords.
        </p>
        <ManualAssistBanner />
        {renderLink ? (
          renderLink({ href: projectsHref, className: btnPrimary, children: "Go to projects" })
        ) : (
          <a href={projectsHref} className={btnPrimary}>
            Go to projects
          </a>
        )}
      </div>
    );
  }

  const threadList = [...(threads ?? [])].sort((a, b) => b.intentScore - a.intentScore);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Reddit signals</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Real threads from Reddit public search, ranked by intent. AI only drafts replies.
            </p>
          </div>
        </div>
        {onDiscover ? (
          <button type="button" disabled={discovering} onClick={onDiscover} className={btnPrimary}>
            {discovering ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Finding…
              </span>
            ) : (
              "Find threads"
            )}
          </button>
        ) : null}
      </div>

      <ManualAssistBanner />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {loading && threadList.length === 0 ? <PanelLoading label="Loading threads…" /> : null}

      {threadList.length === 0 && !discovering && !loading ? (
        <div className="paper-card space-y-2 p-8 text-center">
          <p className="text-sm font-medium">No threads yet</p>
          <p className="text-sm text-muted-foreground">
            Click &quot;Find threads&quot; to search Reddit for discussions matching your brand
            keywords.
          </p>
        </div>
      ) : null}

      {discovering && threadList.length === 0 ? (
        <PanelLoading label="Searching Reddit…" />
      ) : null}

      <ul className="space-y-3">
        {threadList.map((thread) => (
          <li key={thread.url} className="paper-card p-5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary">{thread.subreddit}</p>
                <h3 className="font-semibold leading-snug">{thread.title}</h3>
              </div>
              <StatusPill label={`Intent ${thread.intentScore}`} tone="primary" />
            </div>
            <a
              href={thread.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open on Reddit <ExternalLink className="h-3 w-3" />
            </a>
            {thread.score != null || thread.numComments != null ? (
              <p className="mb-3 text-xs text-muted-foreground">
                {thread.score != null ? `${thread.score} upvotes` : null}
                {thread.score != null && thread.numComments != null ? " · " : null}
                {thread.numComments != null ? `${thread.numComments} comments` : null}
              </p>
            ) : null}
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Suggested reply (AI draft — edit before posting)
              </p>
              <p className="text-sm text-muted-foreground">{thread.suggestedReply}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={btnOutline}
                onClick={() => {
                  void navigator.clipboard.writeText(thread.suggestedReply);
                  onCopyReply?.(thread.suggestedReply);
                }}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy reply
              </button>
              {paths && renderLink
                ? renderLink({
                    href: paths.studioCreateHref({
                      title: thread.title,
                      keyword: thread.title,
                      angle: `Reply angle from ${thread.subreddit}`,
                    }),
                    className: cn(btnOutline),
                    children: (
                      <>
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Draft in Studio
                      </>
                    ),
                  })
                : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** @deprecated Use ResearchSignalsView */
export const ResearchRedditView = ResearchSignalsView;
