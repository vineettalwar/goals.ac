"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RepeaterField } from "@/components/ui/repeater-field";
import { Textarea } from "@/components/ui/textarea";
import { isDailyFiveItemValid, parseSourceUrls } from "@/lib/content/daily-five-validation";
import type { ContentPieceRow } from "./content-studio-utils";
import { APP_SHELL_PAGE } from "@workspace/app-shell/shell-constants";

type DraftItem = {
  keyword: string;
  section: string;
  notes: string;
  sourceUrls: string;
};

const EMPTY_ITEM: DraftItem = { keyword: "", section: "", notes: "", sourceUrls: "" };
const MAX_TOPICS = 5;

export function DailyFiveClient({ projectId }: { projectId: string }) {
  const [step, setStep] = useState<"setup" | "topics" | "review">("setup");
  const [sectionDefaults, setSectionDefaults] = useState("News");
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }]);
  const [running, setRunning] = useState(false);
  const [created, setCreated] = useState<ContentPieceRow[]>([]);
  const [humanizingIds, setHumanizingIds] = useState<Record<number, boolean>>({});
  const [publishingIds, setPublishingIds] = useState<Record<number, boolean>>({});

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

  async function runBatch() {
    setRunning(true);
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
      const res = await fetch(`/api/website-projects/${projectId}/content-pieces/daily-five`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        created?: ContentPieceRow[];
        failures?: Array<{ index: number; error: string }>;
      };
      if (!res.ok) throw new Error("Failed to generate daily drafts");
      setCreated(data.created ?? []);
      if ((data.failures ?? []).length > 0) {
        toast.error(`${data.failures?.length ?? 0} item(s) failed`);
      } else {
        toast.success("Drafts generated");
      }
      setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Batch failed");
    } finally {
      setRunning(false);
    }
  }

  async function humanize(id: number) {
    setHumanizingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/content-pieces/${id}/humanize`, { method: "POST" });
      if (!res.ok) throw new Error("Humanize failed");
      toast.success("Humanized");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Humanize failed");
    } finally {
      setHumanizingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function publishDraft(id: number) {
    setPublishingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/content-pieces/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "wordpress", async: true }),
      });
      if (!res.ok) throw new Error("Publish queue failed");
      toast.success("Queued for WordPress draft publish");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishingIds((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div className={`${APP_SHELL_PAGE} space-y-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Daily Five</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture topics, generate drafts, then humanize and queue WordPress drafts.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/content-studio`}
          className="shrink-0 text-sm text-primary hover:underline"
        >
          Back to studio
        </Link>
      </div>

      {step === "setup" ? (
        <div className="paper-card space-y-4 rounded-xl p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="daily-five-default-section">Default section</Label>
            <p className="text-sm text-muted-foreground">
              Used when a topic leaves section blank. You can override per topic.
            </p>
            <Input
              id="daily-five-default-section"
              value={sectionDefaults}
              onChange={(e) => setSectionDefaults(e.target.value)}
            />
          </div>
          <Button onClick={() => setStep("topics")}>Start topic capture</Button>
        </div>
      ) : null}

      {step === "topics" ? (
        <div className="space-y-4">
          <RepeaterField
            values={items}
            onChange={setItems}
            createItem={() => ({ ...EMPTY_ITEM, section: sectionDefaults })}
            maxItems={MAX_TOPICS}
            minItems={1}
            label="Topics"
            description="Add up to five keyword angles for today’s batch."
            addFirstLabel="Add first topic"
            addAnotherLabel="Add another topic"
            emptyDescription="Add at least one topic to generate drafts."
            itemLabel={(index) => `Topic ${index + 1}`}
            renderItem={(item, index, update) => (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`daily-five-keyword-${index}`}>Keyword or angle</Label>
                  <Input
                    id={`daily-five-keyword-${index}`}
                    placeholder="Keyword or angle"
                    value={item.keyword}
                    onChange={(e) => update({ ...item, keyword: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`daily-five-section-${index}`}>Section</Label>
                  <Input
                    id={`daily-five-section-${index}`}
                    placeholder="News, Features, Opinion..."
                    value={item.section}
                    onChange={(e) => update({ ...item, section: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`daily-five-notes-${index}`}>Notes</Label>
                  <Textarea
                    id={`daily-five-notes-${index}`}
                    placeholder="Angle, voice, and claims"
                    value={item.notes}
                    onChange={(e) => update({ ...item, notes: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`daily-five-sources-${index}`}>Source URLs</Label>
                  <Textarea
                    id={`daily-five-sources-${index}`}
                    placeholder="Required for News — one URL per line"
                    value={item.sourceUrls}
                    onChange={(e) => update({ ...item, sourceUrls: e.target.value })}
                  />
                </div>
              </div>
            )}
          />
          <Button onClick={runBatch} disabled={!canRun || running}>
            {running ? "Generating..." : "Generate drafts"}
          </Button>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Progress: {created.length} generated. Humanize and publish each draft.
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
                <Button variant="outline" disabled={!!humanizingIds[piece.id]} onClick={() => void humanize(piece.id)}>
                  Humanize
                </Button>
                <Button
                  variant="outline"
                  disabled={!!publishingIds[piece.id]}
                  onClick={() => void publishDraft(piece.id)}
                >
                  Queue WP draft
                </Button>
                <Link
                  href={`/projects/${projectId}/content-piece/${piece.id}`}
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
