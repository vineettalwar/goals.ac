"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isDailyFiveItemValid, parseSourceUrls } from "@/lib/content/daily-five-validation";
import type { ContentPieceRow } from "./content-studio-utils";

type DraftItem = {
  keyword: string;
  section: string;
  notes: string;
  sourceUrls: string;
};

const EMPTY_ITEM: DraftItem = { keyword: "", section: "", notes: "", sourceUrls: "" };

export function DailyFiveClient({ projectId }: { projectId: string }) {
  const [step, setStep] = useState<"setup" | "topics" | "review">("setup");
  const [sectionDefaults, setSectionDefaults] = useState("News");
  const [items, setItems] = useState<DraftItem[]>(Array.from({ length: 5 }, () => ({ ...EMPTY_ITEM })));
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
    [items],
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
            angleHint: [`section:${item.section.trim() || sectionDefaults}`, item.notes.trim(), item.sourceUrls.trim() ? `sources: ${parseSourceUrls(item.sourceUrls).join(", ")}` : ""]
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Five</h1>
          <p className="text-sm text-muted-foreground">Capture topics, generate drafts, then humanize and queue WordPress drafts.</p>
        </div>
        <Link href={`/projects/${projectId}/content-studio`} className="text-sm text-primary hover:underline">
          Back to studio
        </Link>
      </div>

      {step === "setup" ? (
        <div className="space-y-4 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Set your default section for today. You can override per topic.</p>
          <Input value={sectionDefaults} onChange={(e) => setSectionDefaults(e.target.value)} />
          <Button onClick={() => setStep("topics")}>Start topic capture</Button>
        </div>
      ) : null}

      {step === "topics" ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="space-y-3 rounded-xl border p-4">
              <p className="text-sm font-medium">Topic {index + 1}</p>
              <Input
                placeholder="Keyword or angle"
                value={item.keyword}
                onChange={(e) =>
                  setItems((prev) => prev.map((row, i) => (i === index ? { ...row, keyword: e.target.value } : row)))
                }
              />
              <Input
                placeholder="Section (News, Features, Opinion...)"
                value={item.section}
                onChange={(e) =>
                  setItems((prev) => prev.map((row, i) => (i === index ? { ...row, section: e.target.value } : row)))
                }
              />
              <Textarea
                placeholder="Notes for angle, voice, and claims"
                value={item.notes}
                onChange={(e) =>
                  setItems((prev) => prev.map((row, i) => (i === index ? { ...row, notes: e.target.value } : row)))
                }
              />
              <Textarea
                placeholder="Source URLs (required for News)"
                value={item.sourceUrls}
                onChange={(e) =>
                  setItems((prev) => prev.map((row, i) => (i === index ? { ...row, sourceUrls: e.target.value } : row)))
                }
              />
            </div>
          ))}
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
            <div key={piece.id} className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="font-medium">
                  {idx + 1}. {piece.title}
                </p>
                <p className="text-xs text-muted-foreground">{piece.targetKeyword}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={!!humanizingIds[piece.id]} onClick={() => void humanize(piece.id)}>
                  Humanize
                </Button>
                <Button variant="outline" disabled={!!publishingIds[piece.id]} onClick={() => void publishDraft(piece.id)}>
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
