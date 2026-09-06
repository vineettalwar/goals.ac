import { scoreArticleQuality } from "@workspace/content-engine/article-quality-score";
import { scoreTwitterThreadQuality } from "@workspace/content-engine/social-thread-quality";
import { ScoreRing } from "../section-panels/shared";
import { SOCIAL_FORMAT_TYPES } from "../social/types";
import {
  ArticleQualityPanelSeo,
  type ArticleQualityPanelProps,
  type DualContentScore,
} from "./content-quality-panel-seo";

// Re-export types so existing importers don't need to change path.
export type { DualContentScore, ArticleQualityPanelProps };

export function ArticleQualityPanel({
  bodyMarkdown,
  wordCount,
  metadata,
  secondaryKeywords,
  contentPieceId,
  formatType,
  fetchDualScore,
  dualScore,
  writingSample,
  brandVoiceExcerpt,
  brandGlossary,
  brandVoicePassages,
  savedBodyMarkdown,
  baselineScore,
  showScoreDelta = false,
  editing = false,
  onInsertMissingTerm,
  onReplaceBody,
  excludeInternalSlug = null,
  onEnhance,
  enhancing = false,
  canEnhance = false,
}: ArticleQualityPanelProps) {
  const isTwitterThread = formatType === "twitter_thread";
  const isSocial = Boolean(formatType && SOCIAL_FORMAT_TYPES.has(formatType));

  if (isTwitterThread) {
    const thread = scoreTwitterThreadQuality(bodyMarkdown);
    return (
      <div className="paper-card space-y-6 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <ScoreRing score={thread.total} size="md" />
          <div className="min-w-0 space-y-1.5">
            <h3 className="text-sm font-semibold">Thread quality</h3>
            <p className="text-sm text-muted-foreground">
              {thread.total >= 80
                ? "Ready to post"
                : thread.total >= 60
                  ? "Needs polish"
                  : "Tighten before posting"}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {thread.tweetCount} tweet{thread.tweetCount === 1 ? "" : "s"}
              {thread.overLimitCount > 0
                ? ` · ${thread.overLimitCount} over 280 chars`
                : " · scored for X, not SEO articles"}
            </p>
          </div>
        </div>
        <ul className="space-y-3.5">
          {thread.breakdown.map((item) => (
            <li key={item.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span
                  className={
                    item.score === 0
                      ? "shrink-0 font-medium tabular-nums text-red-600"
                      : "shrink-0 font-medium tabular-nums"
                  }
                >
                  {item.score}/{item.max}
                </span>
              </div>
              {item.detail ? (
                <p className="text-xs leading-relaxed text-muted-foreground/80">{item.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
        {canEnhance && onEnhance ? (
          <button
            type="button"
            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={() => onEnhance(undefined)}
            disabled={enhancing}
          >
            {enhancing ? "Tightening…" : "Tighten thread"}
          </button>
        ) : null}
      </div>
    );
  }

  // Other social formats: keep a compact editorial-only view (no SERP/schema/FAQ theatre).
  if (isSocial) {
    const result = scoreArticleQuality({
      bodyMarkdown,
      wordCount,
      writingSample,
      brandVoiceExcerpt,
      brandGlossary,
      brandVoicePassages,
    });
    const human = result.breakdown.find((row) => row.label === "Human voice");
    const word = result.breakdown.find((row) => row.label === "Word count");
    const rows = [human, word].filter(Boolean) as typeof result.breakdown;
    const total = Math.round(
      (rows.reduce((s, r) => s + r.score, 0) / Math.max(1, rows.reduce((s, r) => s + r.max, 0))) *
        100,
    );
    return (
      <div className="paper-card space-y-6 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <ScoreRing score={total} size="md" />
          <div className="min-w-0 space-y-1.5">
            <h3 className="text-sm font-semibold">Post quality</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Social post scoring — SEO checklist hidden for this format.
            </p>
          </div>
        </div>
        <ul className="space-y-3.5">
          {rows.map((item) => (
            <li key={item.label} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {item.score}/{item.max}
              </span>
            </li>
          ))}
        </ul>
        {canEnhance && onEnhance ? (
          <button
            type="button"
            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={() => onEnhance(undefined)}
            disabled={enhancing}
          >
            {enhancing ? "Tightening…" : "Tighten post"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ArticleQualityPanelSeo
      bodyMarkdown={bodyMarkdown}
      wordCount={wordCount}
      metadata={metadata}
      secondaryKeywords={secondaryKeywords}
      contentPieceId={contentPieceId}
      fetchDualScore={fetchDualScore}
      dualScore={dualScore}
      writingSample={writingSample}
      brandVoiceExcerpt={brandVoiceExcerpt}
      brandGlossary={brandGlossary}
      brandVoicePassages={brandVoicePassages}
      savedBodyMarkdown={savedBodyMarkdown}
      baselineScore={baselineScore}
      showScoreDelta={showScoreDelta}
      editing={editing}
      onInsertMissingTerm={onInsertMissingTerm}
      onReplaceBody={onReplaceBody}
      excludeInternalSlug={excludeInternalSlug}
      onEnhance={onEnhance}
      enhancing={enhancing}
      canEnhance={canEnhance}
    />
  );
}
