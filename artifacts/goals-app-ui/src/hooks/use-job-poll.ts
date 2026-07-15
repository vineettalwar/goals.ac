import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

export type JobStatus = {
  jobId: string;
  status: "pending" | "queued" | "running" | "completed" | "failed" | string;
  queue?: string;
  error?: string;
  result?: unknown;
};

type UseJobPollOptions = {
  intervalMs?: number;
  maxAttempts?: number;
  enabled?: boolean;
};

export function useJobPoll(jobId: string | null | undefined, options: UseJobPollOptions = {}) {
  const { intervalMs = 2000, maxAttempts = 120, enabled = true } = options;
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId && enabled));
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);

  const poll = useCallback(async () => {
    if (!jobId) return;
    try {
      const data = await apiFetch<JobStatus>(`/api/jobs/${encodeURIComponent(jobId)}`);
      setStatus(data);
      if (data.status === "completed" || data.status === "failed") {
        setLoading(false);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Job poll failed");
      setLoading(false);
      return false;
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !enabled) {
      setLoading(false);
      return;
    }

    attemptsRef.current = 0;
    setLoading(true);
    setError(null);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;
      attemptsRef.current += 1;
      const shouldContinue = await poll();
      if (!shouldContinue || attemptsRef.current >= maxAttempts) {
        if (attemptsRef.current >= maxAttempts) {
          setError("Job polling timed out");
        }
        setLoading(false);
        return;
      }
      timer = setTimeout(() => void tick(), intervalMs);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, enabled, intervalMs, maxAttempts, poll]);

  return { status, loading, error, isComplete: status?.status === "completed", isFailed: status?.status === "failed" };
}
