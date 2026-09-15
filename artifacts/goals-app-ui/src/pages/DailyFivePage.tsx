import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";
import { isDailyFiveItemValid, parseSourceUrls } from "@workspace/app-shell/studio";
import { apiFetch, API_FETCH_AI_TIMEOUT_MS } from "@/lib/api";

type DraftItem = {
  keyword: string;
  section: string;
  notes: string;
  sourceUrls: string;
};

type CreatedPiece = {
  id: number;
  title: string;
  targetKeyword: string | null;
};

const EMPTY_ITEM: DraftItem = { keyword: "", section: "", notes: "", sourceUrls: "" };
const MAX_TOPICS = 5;

export function DailyFivePage() {
  const { id: projectId } = useParams();
  const [step, setStep] = useState<"setup" | "topics" | "review">("setup");
  const [sectionDefaults, setSectionDefaults] = useState("News");
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPiece[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const canRun = useMemo(
    () =>
      items.some((item) => item.keyword.trim()) &&
      items.every((item) =>
        isDailyFiveItemValid({
          section: item.section.trim() || sectionDefaults,
          sourceUrls: item.sourceUrls,
        }),
      ),
    [items, sectionDefaults],
  );

  if (!projectId) {
    return <p className="p-8 text-muted-foreground">Missing project.</p>;
  }

  async function runBatch() {
    setRunning(true);
    setError(null);
    try {
      const payload = {
        items: items
          .filter((item) => item.keyword.trim())
          .map((item) => ({
            formatType: "blog_post",
            targetKeyword: item.keyword.trim(),
            angleHint: [
              `section:${item.section.trim() || sectionDefaults}`,
              item.notes.trim(),
              item.sourceUrls.trim() ? `sources: ${parseSourceUrls(item.sourceUrls).join(", ")}` : "",
            ]
              .filter(Boolean)
              .join("|"),
            cmsCategories: [item.section.trim() || sectionDefaults],
          })),
      };
      const data = await apiFetch<{
        created?: CreatedPiece[];
        failures?: Array<{ index: number; error: string }>;
      }>(`/api/website-projects/${projectId}/content-pieces/daily-five`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeoutMs: API_FETCH_AI_TIMEOUT_MS,
      });
      setCreated(data.created ?? []);
      if ((data.failures ?? []).length > 0) {
        setError(`${data.failures?.length ?? 0} item(s) failed`);
      }
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed");
    } finally {
      setRunning(false);
    }
  }

  async function humanize(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/content-pieces/${id}/humanize`, {
        method: "POST",
        timeoutMs: API_FETCH_AI_TIMEOUT_MS,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Humanize failed");
    } finally {
      setBusyId(null);
    }
  }

  async function publishDraft(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/content-pieces/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "wordpress", async: true }),
        timeoutMs: API_FETCH_AI_TIMEOUT_MS,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusyId(null);
    }
  }

  function updateItem(index: number, next: DraftItem) {
    setItems((prev) => prev.map((item, i) => (i === index ? next : item)));
  }

  return (
    <div className={`${APP_SHELL_PAGE} space-y-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Daily Five</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture topics, queue drafts, then humanize and send to WordPress.
          </p>
        </div>
        <Link
          to={`/projects/${projectId}/content-studio`}
          className="shrink-0 text-sm text-primary hover:underline"
        >
          Back to studio
        </Link>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {step === "setup" ? (
        <div className="paper-card space-y-4 rounded-xl p-4 sm:p-6">
          <div className="space-y-2">
            <label htmlFor="daily-five-default-section" className="text-sm font-medium">
              Default section
            </label>
            <p className="text-sm text-muted-foreground">
              Used when a topic leaves section blank. You can override per topic.
            </p>
            <input
              id="daily-five-default-section"
              value={sectionDefaults}
              onChange={(event) => setSectionDefaults(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => setStep("topics")}
          >
            Start topic capture
          </button>
        </div>
      ) : null}

      {step === "topics" ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="paper-card space-y-3 rounded-xl p-4">
              <p className="text-sm font-medium">Topic {index + 1}</p>
              <input
                placeholder="Keyword or angle"
                value={item.keyword}
                onChange={(event) => updateItem(index, { ...item, keyword: event.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                placeholder="News, Features, Opinion..."
                value={item.section}
                onChange={(event) => updateItem(index, { ...item, section: event.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Angle, voice, and claims"
                value={item.notes}
                onChange={(event) => updateItem(index, { ...item, notes: event.target.value })}
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Required for News — one URL per line"
                value={item.sourceUrls}
                onChange={(event) => updateItem(index, { ...item, sourceUrls: event.target.value })}
                className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {items.length < MAX_TOPICS ? (
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm"
                onClick={() =>
                  setItems((prev) => [...prev, { ...EMPTY_ITEM, section: sectionDefaults }])
                }
              >
                Add another topic
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void runBatch()}
              disabled={!canRun || running}
            >
              {running ? "Queuing drafts…" : "Generate drafts"}
            </button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {created.length} draft(s) queued. Generation finishes in the background — open a piece to
            review.
          </p>
          {created.map((piece, idx) => (
            <div
              key={piece.id}
              className="paper-card flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {idx + 1}. {piece.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">{piece.targetKeyword}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={busyId === piece.id}
                  onClick={() => void humanize(piece.id)}
                >
                  Humanize
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={busyId === piece.id}
                  onClick={() => void publishDraft(piece.id)}
                >
                  Queue WP draft
                </button>
                <Link
                  to={`/projects/${projectId}/content-piece/${piece.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
