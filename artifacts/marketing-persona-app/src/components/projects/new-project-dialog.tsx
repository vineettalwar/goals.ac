"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Bird, CheckCircle2, Clock, Loader2, Search, SkipForward, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { isQuotaExhaustedPayload } from "@/components/billing/quota-payload-guards";
import { QuotaUpgradePrompt } from "@/components/billing/quota-upgrade-prompt";
import {
  BRAND_SCRAPE_SKIPPED,
  scrapeStatusIsSettled,
} from "@workspace/content-engine/brand/project-voice-ready";

const schema = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Enter a valid URL"),
});
type FormData = z.infer<typeof schema>;

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (project: { id: number }) => void;
}

type SetupStepId = "queue" | "crawl" | "brand";
type SetupStepStatus = "pending" | "active" | "done" | "failed" | "skipped";

const SETUP_STEPS: {
  id: SetupStepId;
  name: string;
  role: string;
  Icon: typeof Search;
}[] = [
  { id: "queue", name: "The Ferret", role: "Queuing site scan", Icon: Search },
  { id: "crawl", name: "The Ferret", role: "Crawling your site", Icon: Search },
  { id: "brand", name: "The Owl", role: "Reading brand voice", Icon: Bird },
];

function deriveSetupSteps(
  crawlStatus: string | null | undefined,
  scrapeStatus: string | null | undefined,
): Record<SetupStepId, SetupStepStatus> {
  const crawlDone = crawlStatus === "done" || crawlStatus === "failed";
  const scrapeDone = scrapeStatusIsSettled(scrapeStatus);
  const crawlFailed = crawlStatus === "failed";
  const scrapeFailed = scrapeStatus === "failed";
  const scrapeSkipped = scrapeStatus === BRAND_SCRAPE_SKIPPED;
  const brandStatus: SetupStepStatus = scrapeSkipped
    ? "skipped"
    : scrapeFailed
      ? "failed"
      : scrapeDone
        ? "done"
        : "pending";

  if (!crawlStatus && !scrapeStatus) {
    return { queue: "active", crawl: "pending", brand: "pending" };
  }
  if (!crawlDone) {
    return {
      queue: "done",
      crawl: crawlFailed ? "failed" : "active",
      brand: brandStatus === "pending" ? "pending" : brandStatus,
    };
  }
  if (!scrapeDone) {
    return {
      queue: "done",
      crawl: crawlFailed ? "failed" : "done",
      brand: scrapeFailed ? "failed" : "active",
    };
  }
  return {
    queue: "done",
    crawl: crawlFailed ? "failed" : "done",
    brand: brandStatus === "pending" ? "done" : brandStatus,
  };
}

function SetupProgress({
  crawlStatus,
  scrapeStatus,
  onSkipBrand,
}: {
  crawlStatus?: string | null;
  scrapeStatus?: string | null;
  onSkipBrand?: () => void;
}) {
  const statuses = deriveSetupSteps(crawlStatus, scrapeStatus);
  const focus =
    SETUP_STEPS.find((s) => statuses[s.id] === "active") ??
    SETUP_STEPS.find((s) => statuses[s.id] === "failed") ??
    SETUP_STEPS.find((s) => statuses[s.id] === "skipped") ??
    SETUP_STEPS[SETUP_STEPS.length - 1]!;
  const FocusIcon = focus.Icon;
  const focusStatus = statuses[focus.id];
  const completed = SETUP_STEPS.filter(
    (s) => statuses[s.id] === "done" || statuses[s.id] === "failed" || statuses[s.id] === "skipped",
  ).length;
  const canSkipBrand =
    Boolean(onSkipBrand) &&
    focus.id === "brand" &&
    (focusStatus === "active" || focusStatus === "failed" || focusStatus === "pending");
  const next = SETUP_STEPS.find(
    (s) => statuses[s.id] === "pending" && SETUP_STEPS.indexOf(s) > SETUP_STEPS.indexOf(focus),
  );

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">Setting up your project</span>
        <span className="text-muted-foreground">
          {completed}/{SETUP_STEPS.length}
        </span>
      </div>
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <FocusIcon className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {focus.name}
              <span className="font-normal text-muted-foreground"> · {focus.role}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {focusStatus === "failed"
                ? "Could not finish this step — you can continue anyway."
                : focusStatus === "skipped"
                  ? "Skipped — you can add a brand voice later."
                  : focusStatus === "done"
                    ? "Done"
                    : "Working…"}
            </p>
          </div>
          {focusStatus === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : focusStatus === "skipped" ? (
            <SkipForward className="h-4 w-4 text-muted-foreground" />
          ) : focusStatus === "failed" ? (
            <X className="h-4 w-4 text-red-600" />
          ) : focusStatus === "active" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        {canSkipBrand ? (
          <button
            type="button"
            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={onSkipBrand}
          >
            Skip reading brand voice
          </button>
        ) : null}
      </div>
      {next ? (
        <p className="text-sm text-muted-foreground">
          Next:{" "}
          <span className="font-medium text-foreground">
            {next.name}
            <span className="font-normal text-muted-foreground"> · {next.role}</span>
          </span>
        </p>
      ) : null}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {SETUP_STEPS.map((s) => {
          const st = statuses[s.id];
          return (
            <span
              key={s.id}
              className={
                st === "active"
                  ? "h-1.5 flex-1 rounded-full bg-primary"
                  : st === "done"
                    ? "h-1.5 flex-1 rounded-full bg-emerald-500/70"
                    : st === "failed"
                      ? "h-1.5 flex-1 rounded-full bg-red-500/70"
                      : st === "skipped"
                        ? "h-1.5 flex-1 rounded-full bg-muted-foreground/40"
                        : "h-1.5 flex-1 rounded-full bg-border"
              }
            />
          );
        })}
      </div>
    </div>
  );
}

export function NewProjectDialog({ open, onOpenChange, onCreated }: NewProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [quotaError, setQuotaError] = useState<{
    message: string;
  } | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [crawlStatus, setCrawlStatus] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [setupSettled, setSetupSettled] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) {
      setCreatedProjectId(null);
      setCrawlStatus(null);
      setScrapeStatus(null);
      setSetupSettled(false);
      setQuotaError(null);
    }
  }, [open]);

  useEffect(() => {
    if (createdProjectId == null || setupSettled) return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      while (!cancelled && attempts < 45) {
        attempts += 1;
        try {
          const res = await fetch(`/api/website-projects/${createdProjectId}`);
          if (res.ok) {
            const data = (await res.json()) as {
              crawlStatus?: string | null;
              scrapeStatus?: string | null;
            };
            setCrawlStatus(data.crawlStatus ?? null);
            setScrapeStatus(data.scrapeStatus ?? null);
            const scrape = data.scrapeStatus;
            const crawl = data.crawlStatus;
            if (
              scrapeStatusIsSettled(scrape) ||
              ((!scrape || scrape === "pending") && (crawl === "done" || crawl === "failed") && attempts > 8)
            ) {
              setSetupSettled(true);
              return;
            }
          }
        } catch {
          // keep polling
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) setSetupSettled(true);
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [createdProjectId, setupSettled]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    setQuotaError(null);
    const res = await fetch("/api/website-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 402 && isQuotaExhaustedPayload(body)) {
        setQuotaError({
          message: body.message ?? "Site quota exhausted. Add your API key in Integrations → AI.",
        });
        return;
      }
      const message =
        (body as { message?: string }).message ??
        (body as { error?: string }).error ??
        "Failed to create project";
      toast.error(message);
      return;
    }
    const project = await res.json();
    if (!project?.id) {
      toast.error("Failed to create project");
      return;
    }
    setCreatedProjectId(project.id);
    setCrawlStatus(project.crawlStatus ?? "pending");
    setScrapeStatus(project.scrapeStatus ?? "pending");
    onCreated?.(project);
  }

  async function skipBrandVoice() {
    const id = createdProjectId;
    if (id == null) return;
    setScrapeStatus(BRAND_SCRAPE_SKIPPED);
    setSetupSettled(true);
    await fetch(`/api/website-projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scrapeStatus: BRAND_SCRAPE_SKIPPED }),
    }).catch(() => {
      // local skip still lets them open the project
    });
  }

  function finish(goToProject: boolean) {
    const id = createdProjectId;
    onOpenChange(false);
    reset();
    if (goToProject && id) {
      window.location.href = `/projects/${id}`;
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md paper-card p-6 shadow-lg overscroll-contain">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">
              {createdProjectId ? "Assembling your project…" : "New project"}
            </Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground" aria-label="Close dialog">
              <X className="h-4 w-4" aria-hidden />
            </Dialog.Close>
          </div>

          {createdProjectId ? (
            <div className="space-y-4">
              <SetupProgress
                crawlStatus={crawlStatus}
                scrapeStatus={scrapeStatus}
                onSkipBrand={skipBrandVoice}
              />
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => finish(false)}>
                  Close
                </Button>
                <Button type="button" disabled={!setupSettled && !scrapeStatus} onClick={() => finish(true)}>
                  {setupSettled ? "Open project" : "Continue in background"}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-project-name">Project name</Label>
                <Input id="new-project-name" autoComplete="organization" placeholder="My Company Blog" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-project-url">Website URL</Label>
                <Input id="new-project-url" type="url" autoComplete="url" placeholder="https://example.com" {...register("url")} />
                {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
                <p className="text-xs text-muted-foreground">
                  We&apos;ll analyze this URL to extract your brand profile automatically.
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner size="sm" className="border-white/30 border-t-white" /> Creating…
                    </>
                  ) : (
                    "Create project"
                  )}
                </Button>
              </div>
              {quotaError && (
                <QuotaUpgradePrompt message={quotaError.message} />
              )}
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
